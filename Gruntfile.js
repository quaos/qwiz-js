
const pkgInfo = require("./package.json");

module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
      pkg: grunt.file.readJSON('package.json'),
      //sourceType: "module",
      
      run: {
        options: {
        // Task-specific options go here.
        },
        build: {
          cmd: 'node',
          args: [
            'node_modules/browserify/bin/cmd.js',
            '-p',
            'esmify',
            'src/index.browser.js',
            '-o',
            'dist/<%= pkg.name %>.bundle.js',
            '--debug'
          ]
        },
        "build-min": {
          cmd: 'node',
          args: [
            'node_modules/browserify/bin/cmd.js',
            '-p',
            'esmify',
            '-g',
            'uglifyify',
            'src/index.browser.js',
            '-o',
            'dist/<%= pkg.name %>.bundle.min.js'
          ]
        },
        "web": {
            cmd: 'node',
            args: [
              'node_modules/http-server/bin/http-server',
              'public',
              '-a',
              '<%= pkg.testWebServer.address %>',
              '-p',
              '<%= pkg.testWebServer.port %>'
            ]
        }
      },
      copy: {
        "js-bundle": {
            expand: true,            
            flatten: false,
            cwd: 'dist',
            src: ['<%= pkg.name %>.bundle.js', '<%= pkg.name %>.bundle.js.map'],
            dest: 'web-demo/assets/js/',
            filter: 'isFile'
        }
      },
      browserSync: {
        bsFiles: {
            src: [
              'assets/css/**/*.css',
              'assets/js/**/*.js',
              '**/*.html' 
            ]
        },
        options: {
          server: {
            baseDir: "web-demo/",
            host: pkgInfo.testWebServer.address, //'<%= pkg.testWebServer.address %>',
            port: pkgInfo.testWebServer.port //'<%= pkg.testWebServer.port %>'
          } //,
          /*ui: {
            host: '<%= pkg.testWebServer.address %>',
            port: '<%= pkg.testWebServer.port %>'
          }*/
        }
      }
    });

    //console.log('Configured URL: <%= pkg.testWebServer.address %>:<%= pkg.testWebServer.port %>');

    grunt.loadNpmTasks('grunt-run');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-browser-sync');
    //grunt.loadNpmTasks( 'grunt-open' );
  
    grunt.registerTask('default', ['run:build', 'run:build-min', 'copy:js-bundle' /*'browserify', "obfuscator" , 'uglify'*/]);
    grunt.registerTask('build', ['run:build', 'run:build-min', 'copy:js-bundle' ]);
    grunt.registerTask('web-demo', ['copy:js-bundle', 'browserSync' ]);
};
