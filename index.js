'use-strict';

var xml = require('xml');
var Base = require('mocha').reporters.Base;
var filePath = process.env.MOCHA_FILE || 'test-results.xml';
var fs = require('fs');
var _ = require('underscore');

module.exports = MochaJUnitReporter;


/**
 * JUnit reporter for mocha.js.
 * @module mocha-junit-reporter
 * @param {EventEmitter} runner - the test runner
 */
function MochaJUnitReporter(runner) {
  // an obj with keys as suites and tests and there values
  var tests = {};

  // get functionality from the Base reporter
  Base.call(this, runner);

  // remove old results
  runner.on('start', function() {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

  runner.on('pass', function(test){
    if(tests[test.parent.title]) {
      tests[test.parent.title].push(this.getTestcaseData(test));
    } else {
      tests[test.parent.title] = [this.getTestcaseData(test)];
    }
  }.bind(this));

  runner.on('fail', function(test, err){
    if(tests[test.parent.title]) {
      tests[test.parent.title].push(this.getTestcaseData(test, err));
    } else {
      tests[test.parent.title] = [this.getTestcaseData(test, err)];
    }
  }.bind(this));

  runner.on('end', function(){
    this.writeXmlToDisk(this.getXml(tests));
  }.bind(this));

}

/**
 * Produces an xml config for a given test case.
 * @param {object} test - test case
 * @param {object} err - if test failed, the failure object
 * @returns {object}
 */
MochaJUnitReporter.prototype.getTestcaseData = function(test, err){
  var testCase = {
    name: test.fullTitle(),
    className: test.title,
    time: test.duration
  };
  if ( err ) {
    testCase.error = err.message;
  }
  return testCase;
};

/**
 * Produces an XML string from the given test data.
 * @param {Object} tests - the test object. The suite name is the key with value
 *          an array of tests for that suite
 */
MochaJUnitReporter.prototype.getXml = function(tests){
  var suites = [];
  _.each(tests, function(cases, key, list) {
    //the xml package expects super funky formatting
    var suite = [
      {
        _attr: {
          name: key,
          tests: cases.length,
          failures: 0,
          timestamp: Date()
        }
      }
    ];
    _.each(cases, function(elem) {
      var formattedCase = {
        _attr: elem
      };
      if(elem.error) {
        suite[0]['_attr'].failures = suite[0]['_attr'].failures + 1;
      }
      suite.push({testcase: formattedCase});
    });
    suites.push({testsuite: suite});
  });
  return xml({ testsuites: suites }, { declaration: true });
};

/**
 * Writes a JUnit test report XML document.
 * @param {string} xml - xml string
 */
MochaJUnitReporter.prototype.writeXmlToDisk = function(xml){
  fs.writeFileSync(filePath, xml, 'utf-8');
  console.log('test results written to', filePath);
};
