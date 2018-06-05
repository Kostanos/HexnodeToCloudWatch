const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch();

class Metric {
  constructor(name, value, unit, timestamp, storageResolution) {
    this.data = {
      MetricName: name,
      Value: value,
      Unit: unit,
      Timestamp: timestamp || Date.now(),
      StorageResolution: storageResolution,
      Dimensions: [],
    };
  }
  dimension(name, value){
    this.data.Dimensions.push({Name: name, Value: value});
    return this;
  }
  dimensions(dimensions){
    if (!Array.isArray(dimensions)) dimensions = [dimensions];
    this.data.Dimensions.push.apply(this.data.Dimensions, dimensions);
    return this;
  }
}

class Track {
  constructor(namespace, storageResolution) {
    this.metrics = [];
    this.namespace = namespace;
    this.storageResolution = storageResolution || 60;
  }
  metric(name, value, unit, isoTimestamp, storageResolution){
    let metric = new Metric(name, value, unit, isoTimestamp || new Date().toISOString(), storageResolution || this.storageResolution);
    this.metrics.push(metric);
    return metric;
  }
  send(){
    if (this.metrics.length){
      let data = {
        MetricData: this.metrics.map(metric => { return metric.data; }),
        Namespace: this.namespace,
      };
      this.metrics = [];
      return cloudwatch.putMetricData(data).promise();
    }
    return Promise.resolve();
  }
}

module.exports = Track;
