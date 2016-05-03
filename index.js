var express = require('express')
var request = require('request')
var app = express();
var bodyParser = require('body-parser')
var config = require('./config.js')
var nerdamer = require('nerdamer')
var rref = require('rref')

var token = config.token

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded


app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === "it's cool if you guys see this")
        return res.send(req.query['hub.challenge']);

    res.send('Error, wrong validation token');
})

app.post('/webhook/', function (req, res) {
    console.log(req.body)
    var messaging_events = req.body.entry[0].messaging;
    console.log(messaging_events)
    for (var i = 0; i < messaging_events.length; i++) {
        event = req.body.entry[0].messaging[i];
        var sender = event.sender.id;
        if (event.message && event.message.text) {
            var text = event.message.text;
            handleMessage(sender, text)
        }
    }
  res.sendStatus(200);
});

var keywords = {
    "simplify": simplifyFunction,
    "rref": rrefFunction
}

function simplifyFunction(sender, text){//doesn't expand factors tho
    var e = nerdamer(text, undefined, ['expand']);
    return e.toString()
}

function rrefFunction(sender, text){
    matrix = text.trim().split("\n").map(function(e){
        return e.trim().split(" ").map(function(f){
            return parseInt(f)
        })
    })
    
    console.log(matrix)
    

    var rrefArray = rref(matrix)
    console.log(rrefArray)
    // var rrefArray = rref(JSON.parse(text))
    var rrefString = JSON.stringify(rrefArray)
    console.log(rrefString)
    var safeRrefString = rrefString.replace("[[","").replace("]]","").replace(/\]\,\[/g,"\n")
    console.log(safeRrefString)
    return safeRrefString

    
}

function handleMessage(sender, text){
    for(var key in keywords){
        if(text.toLowerCase().indexOf(key) == 0){
            var originalExpression = text.replace(key,"").trim()
            var answer = "Whoops, error!"
            
            try{answer = keywords[key](sender, originalExpression)}
            catch(e){console.log(e)}
            
            return sendTextMessage(sender, answer)
        }
    }
    
    
    return sendTextMessage(sender, "I'm sorry, your syntax was poor. Try sending something along the lines of \nsimplify x^2-")
    
}

function sendTextMessage(sender, text) {
    messageData = {
        text:text
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
}


app.listen(process.env.PORT, function () {
    console.log("running")
});