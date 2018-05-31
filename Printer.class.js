'use strict';

const moment = require('moment');
const mdns = require('mdns-js');
const uuidv5 = require('uuid/v5');
const _ = require('lodash');
const ipp = require('ipp');

const BreakException = {};

module.exports = class Printer {

	constructor() {
		this.localDiscoveryList = {};

		this.browser = mdns.createBrowser();
		this.browser.on('ready', () => {
			this.browser.discover()
		});
		this.browser.on('update', (data) => {
			try{
				data.type.forEach((type) => {
					if(type.name == 'ipp' || type.name == 'ipps') {
						if(!this.localDiscoveryList[data.addresses[0]]) {
							console.log('New Printer: ' + data.addresses[0])
						} else {
							console.log('Printer update: ' + data.addresses[0])
						}
						this.localDiscoveryList[data.addresses[0]] = {
							status: 'OK',
							mdns: data
						}
						this.getPrinterAttributes(data.addresses[0], (err, printer) => {
							if(err) {
								this.localDiscoveryList[data.addresses[0]].status = 'ERROR';
								this.localDiscoveryList[data.addresses[0]].error = err;
							} else {
								this.localDiscoveryList[data.addresses[0]].printer = printer;
							}
						})
						console.log('Found printer. Total: ' + Object.keys(this.localDiscoveryList).length)
						throw BreakException;
					}
				})
			}catch(e){ if(e !== BreakException) throw e }
		});

		// DEBUG Message
		console.warn('Printer instance initialized');

		// DEBUG Printer List
		// setTimeout(() => {
		// 	console.log("Printers", this.localDiscoveryList)
		// }, 3000)
	}

	// Get printers on local network from discovery result
	getPrinters() {
		return this.localDiscoveryList;
	}

	// Get printer mdns and ipp information (from stored value)
	// Argument: ip
	getPrinter(ip) {
		return this.localDiscoveryList[ip];
	}

	// Get printer ipp information
	// Argument: ip, callback
	// Callback: function(err, result)
	getPrinterAttributes(ip, callback) {
		let printer = ipp.Printer("ipp://" + ip );
		printer.execute("Get-Printer-Attributes", null, callback);
	}

	// Get job attributes
	// Argument: ip, job-uri, callback
	// Callback: function(err, result)
	getJobAttributes(ip, uri, callback) {
		let printer = ipp.Printer("ipp://" + ip );
		let msg = {
			"operation-attributes-tag": {
				'job-uri': uri
			}
		};
		printer.execute("Get-Job-Attributes", msg, callback);
	}

	// Print JPEG
	// Argument: ip, buffer(JPEG), meta, callback
	// Callback: function(err, result)
	printJPEG(ip, buffer, meta, callback) {
		let printer = ipp.Printer("ipp://" + ip );
		let msg = {
			"operation-attributes-tag": {
				"requesting-user-name": "C15YO-NodePrinter",
				"job-name": moment().toString() + ".jpg",
				"document-format": "image/jpeg"
			},
			data: buffer
		};

		if(meta["job-attributes-tag"]) {
			msg["job-attributes-tag"] = meta["job-attributes-tag"];
		}

		printer.execute("Print-Job", msg, callback);
	}

}