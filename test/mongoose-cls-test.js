'use strict';

var mongoose = require('mongoose');
var cls = require('continuation-local-storage');
var clsMongoose = require('../index.js');
var shimmer = require('shimmer');

var tap = require('tap');



var getMongooseVersion = function() {
    var fs = require('fs');
    var file = 'node_modules/mongoose/package.json';
    file = fs.readFileSync(file, 'utf8');
    var json = JSON.parse(file);
    var version = json.version;
    return(version);
};



tap.test("mongoose with cls", function (t) {

    var mongooseVersion = getMongooseVersion();
    
    //connect mongoose to some mongo instance 
    mongoose.connect('mongodb://localhost/mongoose-cls-test', function(err) {
        
        //define a mongoose Model
        var TestModel = mongoose.model('test_model', mongoose.Schema({value: String}));
        var clsns;
        
        /*
        TestModel.find_orig = TestModel.find;
        TestModel.find = function(conditions, projection, options, callback) {
            console.log("in overridden find, clsns.get('nsvalue'): " + clsns.get("nsvalue") );

            clsns.run(function() {
                console.log("in overridden find's run, clsns.get('nsvalue'): " + clsns.get("nsvalue") );
                TestModel.find_orig(conditions, projection, options, function(err, results) {
                    console.log("in overridden find's callback, clsns.get('nsvalue'): " + clsns.get("nsvalue") );
                    clsns.run(function() {
                        console.log("in overridden find's callback's run(), clsns.get('nsvalue'): " + clsns.get("nsvalue") );
                        callback(err, results);
                        
                    });
                }); 
            });
        };*/



        //initialise a cls, apply the cls-mongoose shim then .run() the rest of the test within it
        clsns = cls.createNamespace('testnamespace');
        clsMongoose(clsns);

/*
        shimmer.wrap(mongoose.Model, 'find', function (original) {

            console.log("in overridden Model.find's run");//, clsns.get('nsvalue'): " + clsns.get("nsvalue") );
            return function(conditions, projection, options, callback) {
                callback = clsns.bind(callback);
                return original.call(this, conditions, projection, options, callback);
            };
        });


        shimmer.wrap(mongoose.Model, 'update', function (original) {

            console.log("in Model.update's shim");//, clsns.get('nsvalue'): " + clsns.get("nsvalue") );
            return function() {
                console.log("in shimmed Model.update(), arguments.length: " + arguments.length);//, clsns.get('nsvalue'): " + clsns.get("nsvalue") );
                var callback = arguments[arguments.length-1];
                var boundCallback = clsns.bind(callback);
                arguments[arguments.length-1] = boundCallback;
                return original.call(this, arguments[0], arguments[1], arguments[2], arguments[3]);
            };
        });
        */
        
        /*
        var wrapLastParamInCLSBind = function(clsns, container, functionName) {
            shimmer.wrap(container, functionName, function (original) {

                //console.log("in '" + functionName + "'s shim");//, clsns.get('nsvalue'): " + clsns.get("nsvalue") );
                return function() {
                    //console.log("in shimmed '" + functionName + "', arguments.length: " + arguments.length);//, clsns.get('nsvalue'): " + clsns.get("nsvalue") );
                    var lastArg = arguments[arguments.length - 1];
                    if (lastArg && ('function' == typeof lastArg)) {
                        var clsBoundLastArg = clsns.bind(lastArg);
                        arguments[arguments.length - 1] = clsBoundLastArg;
                    }
                    return original.call(this, arguments[0], arguments[1], arguments[2], arguments[3]);
                };
            });
        };

        wrapLastParamInCLSBind(clsns, mongoose.Model, 'find');
        wrapLastParamInCLSBind(clsns, mongoose.Model, 'update');
        */
        clsns.run(function() {
            clsns.set("nsvalue", "set");
            
            t.equals(clsns.get("nsvalue"), "set");
            
            setTimeout(function() {
                //prove that the cls-stored value is available across setTimeout()
                t.equals(clsns.get("nsvalue"), "set");
                
                //do Model.find
                TestModel.find({}, null, null, function (err, findResult) {
                    
                    //check that the cls-stored value is still available                                    
                    t.equals(clsns.get("nsvalue"), "set");
                    if (clsns.get("nsvalue") !== "set") t.bailout("cls value empty after TestModel.find() - mongooseVersion: " + mongooseVersion);   //FAILS HERE ON MONGOOSE 4.0 or 4.1 but 3.8 or 3.9 are ok
                    
                    //do Model.update
                    TestModel.update({"nonexistent_field": "nonexistent_value"}, {$set: {value: "modified entry"}}, function (err, updateResult) {

                        //check that the cls-stored value is still available                                    
                        t.equals(clsns.get("nsvalue"), "set");                                       
                        
                        if (clsns.get("nsvalue") !== "set") t.bailout("cls value empty after TestModel.update() - mongooseVersion: " + mongooseVersion);       //FAILS HERE ON MONGOOSE 3.8 or 3.9
                        
                        //do Model.find
                        TestModel.distinct('doesntExist', function (err, findResult) {
                            
                            //check that the cls-stored value is still available                                    
                            t.equals(clsns.get("nsvalue"), "set");
                            if (clsns.get("nsvalue") !== "set") t.bailout("cls value empty after TestModel.distinct() - mongooseVersion: " + mongooseVersion);
                            
                            TestModel.count({}, function (err, findResult) {
                                //check that the cls-stored value is still available                                    
                                t.equals(clsns.get("nsvalue"), "set");
                                if (clsns.get("nsvalue") !== "set") t.bailout("cls value empty after TestModel.count() - mongooseVersion: " + mongooseVersion);
                                
                                t.end();
                            });
                        });
                        
                    });
                    
                });
                
            }, 500);                        
        });
    
    });

});

tap.tearDown(function(){
    mongoose.disconnect();
});

