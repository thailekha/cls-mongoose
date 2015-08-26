'use strict';

var mongoose = require('mongoose');
var cls = require('continuation-local-storage');
var clsMongoose = require('../index.js');

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
        
        
        //initialise a cls, apply the cls-mongoose shim then .run() the rest of the test within it
        var clsns = cls.createNamespace('testnamespace');
        clsMongoose(clsns);        
        clsns.run(function() {
            clsns.set("nsvalue", "set");
            
            t.equals(clsns.get("nsvalue"), "set");
            
            setTimeout(function() {
                //prove that the cls-stored value is available across setTimeout()
                t.equals(clsns.get("nsvalue"), "set");
                
                //do Model.find
                TestModel.find({}, function (err, findResult) {
                    
                    //check that the cls-stored value is still available                                    
                    t.equals(clsns.get("nsvalue"), "set");
                    if (clsns.get("nsvalue") !== "set") t.bailout("cls value empty after TestModel.find() - mongooseVersion: " + mongooseVersion);   //FAILS HERE ON MONGOOSE 4.0 or 4.1 but 3.8 or 3.9 are ok
                    
                    //do Model.update
                    TestModel.update({"nonexistent_field": "nonexistent_value"}, {$set: {value: "modified entry"}}, function (err, updateResult) {

                        //check that the cls-stored value is still available                                    
                        t.equals(clsns.get("nsvalue"), "set");                                       
                        
                        if (clsns.get("nsvalue") !== "set") t.bailout("cls value empty after TestModel.update() - mongooseVersion: " + mongooseVersion);       //FAILS HERE ON MONGOOSE 3.8 or 3.9
                        
                        t.end();
                    });
                    
                });
                
            }, 500);                        
        });
    
    });

});

tap.tearDown(function(){
    mongoose.disconnect();
});

