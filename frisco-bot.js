var configPath = (process.argv[2] || './config.json'),
    credsPath = (process.argv[3] || './twitterCreds.json');

var Twit = require('twit'),
    config = require(configPath),
    twitterCreds = require(credsPath);

var FriscoBot = module.exports = function(config) {
    var filterWords = config.filterWords,
        requiredWords = config.requiredWords,
        trackWords = config.track,
        rateLimit = config.rateLimit || 0,
        timeLastTweet = 0;

    // normalize all the filtered, required, and tracked words
    filterWords = filterWords.map(this.normalizeText);
    requiredWords = requiredWords.map(this.normalizeText);
    trackWords = trackWords.map(this.normalizeText);

    // add trackWords to required words because twitter
    // will include tweets that don't directly include
    // trackWords but link to things that do
    requiredWords = requiredWords.concat(trackWords);

    // set up twitter stream using filters
    var twit = new Twit(twitterCreds),
        filters = {};

    if (trackWords.length) {
        filters['track'] = trackWords;
    }
    if (config.locations && config.locations.length) {
        filters['locations'] = config.locations;
    }

    var stream = twit.stream('statuses/filter', filters);

    stream.on('tweet', function(tweet) {
        var text = this.normalizeText(tweet.text);

        // filter out tweets full of hashtags
        if ((text.match(/#/g)||[]).length >= config.tooManyHashtags) {
            console.log('hashtags (@' + tweet.user.screen_name + ') > ', tweet.text);
            return;
        }

        // if there are required words, filter tweets without them
        if (requiredWords && requiredWords.length) {
            if (!containsAnyOf(requiredWords, text)) {
                console.log('required (@' + tweet.user.screen_name + ') > ', tweet.text);
                return;
            }
        }

        // filter out tweets that could be sensitive
        var filteredWord = containsAnyOf(filterWords, text);
        if (filteredWord) {
            console.log('filtered (@' + tweet.user.screen_name + ') > ', filteredWord);
            return;
        }

        var timeNow = +(new Date()),
            shouldRateLimit = timeNow < timeLastTweet + rateLimit;

        // be careful what you do this this...
        var response = this.generateResponse(tweet, config.responses);

        console.log('-------');
        console.log('user:', tweet.user.screen_name);
        console.log('tweet:', tweet.text);
        console.log('response:', response);
        console.log('rateLimited:', shouldRateLimit);
        console.log('-------');

        if (!shouldRateLimit) {
            timeLastTweet = timeNow;

            if (config.reallyActuallyTweet) {
                twit.post('statuses/update', { in_reply_to_status_id: tweet.id_str, status: response }, function(err, data, response) { 
                    if (err) {
                        console.log('Error:\n', err);
                    }
                });
            }
        }

    }.bind(this));

    stream.on('error', function(err) {
        console.log('Error:\n', err);
    });

    // set up user stream
    var userStream = twit.stream('user');

    userStream.on('follow', function(eventMsg) {
        console.log('FOLLOWED BY @' + eventMsg.source.screen_name);

        if (eventMsg.target.screen_name == config.twitterHandle) {
            // someone followed us!
            twit.post('friendships/create', { user_id: eventMsg.source.id_str, follow: true }, function(err, data, response) { 
                if (err) {
                    console.log('Error:\n', err);
                }
            });
        }

    }.bind(this));

    userStream.on('error', function(err) {
        console.log('Error:\n', err);
    });

    setInterval(this.autoUnfollow.bind(this, config, twit), 30000);
};

FriscoBot.prototype.autoUnfollow = function(config, twit) {
    twit.get('followers/ids', { screen_name: config.twitterHandle, stringify_ids: true }, function (err, followers, response) {
        if (err) {
            return console.log('Error:\n', err);
        }

        twit.get('friends/ids', { screen_name: config.twitterHandle, stringify_ids: true }, function (err, following, response) {
            if (err) {
                return console.log('Error:\n', err);
            }

            // unfollow people who left
            var toUnfollow = following.ids.filter(function(f) { return followers.ids.indexOf(f) < 0 });
            console.log('UNFOLLOWING:', toUnfollow);

            toUnfollow.forEach(function(f) {
                twit.post('friendships/destroy', { user_id: f }, function(err, data, response) {
                    if (err) {
                        return console.log('Error:\n', err);
                    }
                });
            });
        });
    });
};

FriscoBot.prototype.normalizeText = function(text) {
    return text.toLowerCase();
};

FriscoBot.prototype.generateResponse = function(tweet, responses) {
    var response = '@' + tweet.user.screen_name + ' ';
    response += randFromArray(responses);

    return response;
};

function containsAnyOf(needles, haystack) {
    for (var i = 0; i < needles.length; ++i) {
        if (haystack.indexOf(needles[i]) != -1) {
            return needles[i];
        }
    }
    return undefined;
};

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
};

function randFromArray(arr) {
    return arr[randInt(0, arr.length)];
};

// run free, little twitter bot...
var bot = new FriscoBot(config);
