module.exports = function() {
   var express = require('express'),
       app = express();
       
   // add status service
   app.get('/status', function(req, res){
     res.header('Content-Type', 'application/json');
     res.header('Charset', 'utf-8')
     res.send(req.query.callback + '({"status": "running"});');
   });
       
   return app;
}

module.exports.tool = undefined;
module.exports.addTool = function(newTool){ this.tool = newTool };

module.exports.listen = function(io) {
   io.sockets.on('connection', function (socket) {
         // socket.emit('news', { hello: 'server talking!'});
      socket.on('run', function (params) {
         var spawn = require('child_process').spawn,
             urlParser = require('url');
         var remotes = [];
         var args = [];

         for ( var i=0; i < params.arguments.length; i++ ) {
            var arg = params.arguments[i];
            console.log('arg = ' + arg);
            var pattern = new RegExp(/^http:/);
            if ( arg.match(pattern) ) {
            // if ( check(arg).isUrl() ) {
               var parts = urlParser.parse(arg, true);
               // console.log('parts = ' + parts.query.arguments);
               remotes.push(parts);
               // console.log('remot = ' + remotes[0].params.arguments);
            } else {
               args.push(params.arguments[i]);
            }
         }

         // add user options
         for ( var opt in params.options ) {
           if ( params.options.hasOwnProperty(opt) ) {
              // add param
              if (params.options[opt] != undefined)
                args.unshift(params.options[opt]);
              // add option flag
              args.unshift( opt );
            }
         }
         console.log('options')
         // add default options
         for ( var opt in module.exports.tool.options ) {
           if ( module.exports.tool.options.hasOwnProperty(opt) ) {
              // add param
              if (module.exports.tool.options[opt] != undefined)
                args.unshift(module.exports.tool.options[opt]);
              // add option flag
              args.unshift( opt );
            }
         }
         
         console.log('subUtils')
         // add subutils
         if (params.subUtils != undefined)
            for ( var j=0; j < params.subUtils.length; j++)
               args.unshift(params.subUtils[j]);
         
console.log('start')
         socket.emit('start');

          console.log('ARRRRRRRG = ' + args);
         console.log(module.exports.tool.path + ' ' + args);
         
         var prog = spawn(module.exports.tool.path, args);        

         for ( var j=0; j < remotes.length; j++ ) {
                        
              var ioClient = require('socket.io-client');
              var pathname = remotes[j].host || remotes[j].pathname;
              var clientUrl = remotes[j].protocol + '//' + pathname;
              console.log('url = ' + clientUrl);
              var clientSocket = ioClient.connect(clientUrl);
              var fs = require('fs');
              
              //convert arguments string into array
              remotes[j].query.arguments = remotes[j].query.arguments.split(',');
              
              clientSocket.emit('run', remotes[j].query);

              clientSocket.on('results', function(args) {
                 var data = args.data,
                     options = args.options;
                     
                 if (options && options.convert) 
                    prog.stdin.write( new Buffer(data, options.convert.from).toString(options.convert.to), options.convert.to );
                 else
                     prog.stdin.write( data );
              });
         }
         
          prog.stdout.on('data', function (data) {
             module.exports.tool.send(socket, data);
           });

           prog.stderr.on('data', function (data) {
             console.log('prog stderr: ' + data);
           });

           prog.on('exit', function (code) {
             if (code !== 0) {
               console.log('prog process exited with code ' + code);
             }
           });
         

      });

   });
};


// module.exports.parsers = {
//    vcf: function(chunk) {
//       var lines = chunk.split('\n');
//       var numLines = lines.length
//       for ( var i=0; i < numLines; i++) {
//          if (lines[i].charAt(0) != '#') {
//             var values = lines[i].split("\t");
//             return {
//                      chrom : values[0],
//                      pos   : values[1],
//                      id    : values[2],
//                      ref   : values[3],
//                      alt   : values[4],
//                      qual  : values[5],
//                      filter: values[6],
//                      info  : values[7]
//             };
//          }
//       }
//    }
// }