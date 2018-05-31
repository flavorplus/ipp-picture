# Printing Service [![npm](https://img.shields.io/npm/v/c15yo-printing.svg)](https://www.npmjs.com/package/c15yo-printing)

This is a printing service class serving following functions

* Discover IPP Printers in the local network
* Get Printer via IPP Protocols
* Get Printer's Supported Job Attributes
* Send and Print JPEG
* Check Print Job (with Job ID)

# Installing Printing Service

```
npm install --save c15yo-printing
```

```js
// Using require()
const Printer = require('c15yo-printing')
```

## Library usage

Create an instance of the `Printer` class.

```js
// ES2015 modules
const Printer = require('c15yo-printing')
const printer = new Printer();
```

By initializing an instance of `Printer`, a mDNS discovery service will start searching and detects updates from the network.

## Printer Discovery

Since printer discovery service is started since `Printer` instance is created. This feature queries the list of printer and returns necessary information.

### getPrinters()

#### Return Value

```js
{
    // Printer
    "10.0.0.254": {
        "status": "OK", // Printer query status, "OK" or "ERROR"
        "mdns": [MDNS Object], // mDNS query result in Object format
        "printer": [IPPPrinter Object], // If status is "OK", this object will be populated. Printer full attributes information in Object format
        "error": [Error] // If status is "ERROR", this object will be populated.
    },
    ... // More printers
}
```

##### MDNS Object

mDNS Object from local network discovery

```js
{
    "addresses": [Array(String)], // Array of address
    "query": [Array(String)], // Array of MDNS queries
    "type": [Array(Object)], // Array of MDNS responses and supported protocols
    ... // Unnecessary items
}
```

##### IPP Printer Object

IPP Printer Object

```js
{
    "version": "2.0", // IPP Protocol Version
    "statusCode": "successful-ok", // IPP Query status
    "id": 24255051, // IPP Query ID
    "operation-attributes-tag": [Object], // Printer operational configuration tags
    "printer-attributes-tag": [Object], // Printer operational attributes
}
```

#### Example

```js
var printers = printer.getPrinters()
```

### getPrinter(ip)

#### Argument: ip

Type: `string`

IP Address of the printer. This ip address must be from discovered printer list or null will be returned.

#### Return Value

```js
{
    "status": "OK", // Printer query status, "OK" or "ERROR"
    "mdns": [MDNS Object], // mDNS query result in Object format
    "printer": [IPPPrinter Object], // If status is "OK", this object will be populated. Printer full attributes information in Object format
    "error": [Error] // If status is "ERROR", this object will be populated.
}
```

### getPrinterAttributes(ip, callback)

#### Argument: ip

Type: `string`

IP Address of the printer.


#### Argument: callback

Type: `function(error, result)`
Arguments:
`error`: If no error occured, this object will be `undefined`. Otherwise, an `Error` object will be returned.
`result`: If no error occured, this object will be populated with an `IPP Printer Object`

## Printer Operation

### printJPEG(ip, buffer, meta, callback)

Send a JPEG print job to the printer

#### Argument: ip

Type: `string`

IP Address of the printer.

#### Argument: buffer

Type: JavaScript Buffer `<buffer>` | `String`

JPEG Buffer. e.g. `fs.readFileSync('something.jpg')`

#### Argument: meta

Type: `Object`

##### Example
```js
{
    "job-attributes-tag": [Object], // Print job attributes. e.g. Copies, Quality, etc.
}
```

#### Argument: callback

Type: `function(error, result)`
Arguments:
`error`: If no error occured, this object will be `undefined`. Otherwise, an `Error` object will be returned.
`result`: 
```js
{
    "status": "OK", // "OK" or "ERROR"
    "data": [Object] | String, // If status is "OK", an IPP Job Object will be populated here. 
                                // If there is an error, this field will be an error message.
    "job": String // If status is "OK", a base64 encoded print job uri will be populated here.
}
```

### getJobAttributes(ip, uri, callback)

Get `processing`, `completed` or `cancelled` print job details by the `job` id.

#### Argument: ip

Type: `string`

IP Address of the printer.

#### Argument: uri

Type: `string`

Job URI. (By decoding the base64 job id. see `printJPEG`=>`callback`.

#### Argument: callback

Type: `function(error, result)`
Arguments:
`error`: If no error occured, this object will be `undefined`. Otherwise, an `Error` object will be returned.
`result`: 
```js
{
    "status": "OK", // "OK" or "ERROR"
    "job": [Object] // If status is "OK", job object will be populated here.
}
```
