const rp = require('request-promise-native');
const throat = require('throat');
const Track = require('./Track');

exports.handler = (event) => {
  // Se HexNode documentation to generate the key: https://www.hexnode.com/mobile-device-management/hexnode-mdm-api/
  // and https://www.hexnode.com/mobile-device-management/help/hexnode-mdm-api-documentation/
  const hnAPIKey = process.env.API_KEY;
  const hnAPIHost = process.env.API_HOST;  // https://<portal>.hexnodemdm.com/api/v1
  const devicesGroupId = process.env.DEVICES_GROUP_ID;  // ID of HexNode Devices group to process all devices on it
  const storageResolution = process.env.STORAGE_RESOLUTION || 60;  // Storage resolution parameter, default 1 minute
  const namespace = process.env.NAMESPACE || 'HexNode Devices';

  // Get list of devices
  const options = {
    method: 'GET',
    uri: `${hnAPIHost}/devicegroups/${devicesGroupId}/`,
    headers: { Authorization: hnAPIKey },
    timeout: 2000,  // Let make it faster if request fails
    json: true,
  };
  return rp(options).then(group => {
    if (!group.devices.length){
      console.log(`No devices in Devices Group - ${group.groupname} (${devicesGroupId})`);
      return Promise.resolve();
    }

    const track = new Track(namespace, storageResolution);

    return Promise.all(group.devices.map(throat(2, device => {
      // Get device info
      const options = {
        method: 'GET',
        uri: `${hnAPIHost}/devices/${device.id}/`,
        headers: { Authorization: hnAPIKey },
        timeout: 2000,  // Let make it faster if request fails
        json: true,
      };
      return rp(options)
      .then(deviceInfo => {
        // Collect all metrics to one array, so we send them once after
        const deviceName = deviceInfo.device.device_name + ' - ' + device.id;
        track.metric('BatteryLevel', deviceInfo.device.battery_level, 'Percent').dimension('Device', deviceName);
        track.metric('AvailableDeviceCapacity', deviceInfo.device.available_device_capacity, 'Gigabytes').dimension('Device', deviceName);
      });
    })))
    .then(() => {
      console.log(`${track.metrics.length} metrics to send`);
      return track.send();
    })
    .then(res => {
      console.log('Metrics sent', res);
    })
    .catch(err => {
      console.log(`Error on getting information from device`, err.message);
      console.trace();
    });
  });
};
