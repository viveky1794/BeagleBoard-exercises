// From Getting Started With node.js and socket.io 
// http://codehenge.net/blog/2011/12/getting-started-with-node-js-and-socket-io-v0-7-part-2/
"use strict";

var http = require('http'),
    url = require('url'),
    fs = require('fs'),
    exec = require('child_process').exec,
    server,
    connectCount = 0;	// Number of connections to server

    var pwmPath    = "/sys/class/pwm/ehrpwm.1:0";
    var pinMuxPath = "/sys/kernel/debug/omap_mux";
    var errCount = 0;	// Counts the AIN errors.

// Initialize various IO things.
function initIO() {
    // Make sure gpio 7 is available.
    var gpio = 7;
    fs.writeFile("/sys/class/gpio/export", gpio);

    // Initialize pwm
    // Clear up any unmanaged usage
/*
    fs.writeFileSync(pwmPath+'/request', '0');
    // Allocate and configure the PWM
    fs.writeFileSync(pwmPath+'/request', '1');
    fs.writeFileSync(pwmPath+'/period_freq', 1000);
    fs.writeFileSync(pwmPath+'/duty_percent', '0');
    fs.writeFileSync(pwmPath+'/polarity', '0');
    fs.writeFileSync(pwmPath+'/run', '1');
    // Set pin Mux
//	Don't know why the wiretFileSync doesn't work
//    fs.writeFileSync(pinMuxPath+'/gpmc_a2', '0x0e'); // pwm, no pull up
    exec("echo 0x0e > " + pinMuxPath + "/gpmc_a2");
*/
}

initIO();

server = http.createServer(function (req, res) {
// server code
    var path = url.parse(req.url).pathname;
    console.log("path: " + path);
    switch (path) {
    case '/':
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write('<h1>Hello!</h1>Try<ul><li><a href="/buttonBox.html">Button Box Demo</a></li></ul>');

        res.end();
        break;

    default:		// This is so all the files will be sent.
        fs.readFile(__dirname + path, function (err, data) {
            if (err) {return send404(res); }
//            console.log("path2: " + path);
            res.write(data, 'utf8');
            res.end();
        });
        break;

    }
});

var send404 = function (res) {
    res.writeHead(404);
    res.write('404');
    res.end();
};

server.listen(8081);
console.log("Listening on 8081");

// socket.io, I choose you
var io = require('socket.io').listen(server);
io.set('log level', 2);

// on a 'connection' event
io.sockets.on('connection', function (socket) {
    var frameCount = 0;	// Counts the frames from arecord
    var lastFrame = 0;	// Last frame sent to browser
    console.log("Connection " + socket.id + " accepted.");
//    console.log("socket: " + socket);

    // now that we have our connected 'socket' object, we can 
    // define its event handlers

    // Make sure some needed files are there
    // The path to the analog devices changed from A5 to A6.  Check both.
    var ainPath = "/sys/devices/ocp.2/helper.15/";
    if(!fs.existsSync(ainPath)) {
	// Use device tree to make path appear.
        fs.writeFileSync("/sys/devices/bone_capemgr.9/slots", "cape-bone-iio");
    }    

    // Send value every time a 'message' is received.
    socket.on('ain', function (ainNum) {
//        var ainPath = "/sys/devices/platform/omap/tsc/ain" + ainNum;
        fs.readFile(ainPath + "AIN" + ainNum, 'base64', function(err, data) {
            if(err && errCount++<5) console.log("AIN read error"); //throw err;
            socket.emit('ain', data);
//            console.log('emitted ain: ' + data);
        });
    });

    socket.on('gpio', function (gpioNum) {
        var gpioPath = "/sys/class/gpio/gpio" + gpioNum + "/value";
        fs.readFile(gpioPath, 'base64', function(err, data) {
            if (err) throw err;
            socket.emit('gpio', data);
//            console.log('emitted gpio: ' + data);
        });
    });

    socket.on('i2c', function (i2cNum) {
//        console.log('Got i2c request:' + i2cNum);
        exec('i2cget -y 1 ' + i2cNum + ' 0 w',
            function (error, stdout, stderr) {
//		The TMP102 returns a 12 bit value with the digits swapped
                stdout = '0x' + stdout.substring(4,6) + stdout.substring(2,4);
//                console.log('i2cget: "' + stdout + '"');
                if(error) { console.log('error: ' + error); }
                if(stderr) {console.log('stderr: ' + stderr); }
                socket.emit('i2c', stdout);
            });
    });

    socket.on('led', function (ledNum) {
        var ledPath = "/sys/class/leds/beaglebone:green:usr" + ledNum + "/brightness";
//        console.log('LED: ' + ledPath);
        fs.readFile(ledPath, 'utf8', function (err, data) {
            if(err) throw err;
            data = data.substring(0,1) === "1" ? "0" : "1";
//            console.log("LED%d: %s", ledNum, data);
            fs.writeFile(ledPath, data);
        });
    });

    socket.on('trigger', function(trig) {
//	console.log('trigger: ' + trig);
	if(trig) {
		trigger("heartbeat mmc0 cpu0 none");
	} else {
		trigger("none none none none");
	}
    });
    function trigger(arg) {
        var ledPath = "/sys/class/leds/beaglebone:green:usr";
//	console.log("trigger: " + arg);
	arg = arg.split(" ");
	for(var i=0; i<4; i++) {
//	    console.log(" trigger: ", arg[i]);
	    fs.writeFile(ledPath + i + "/trigger", arg[i])
	}
    }

    socket.on('slider', function(slideNum, value) {
//	console.log('slider' + slideNum + " = " + value);
        fs.writeFile(pwmPath + "/duty_percent", value);

    });

    socket.on('disconnect', function () {
        console.log("Connection " + socket.id + " terminated.");
        connectCount--;
        if(connectCount === 0) {
        }
        console.log("connectCount = " + connectCount);
    });

    connectCount++;
    console.log("connectCount = " + connectCount);
});

