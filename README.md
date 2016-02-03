# Frisco Bot
###### I think you mean "Frisco"

## How to run

1. `git clone https://github.com/buzzfeed-openlab/frisco-bot.git`
2. `cd ./frisco-bot; npm install`
3. Create a `twitterCreds.json` file containing:

  ```json
  {
      "consumer_key": "XXXXX",
      "consumer_secret": "XXXXXX",
      "access_token": "XXX-XXXXXXX",
      "access_token_secret": "XXXXX"
  }
```
4. `node frisco-bot.js [/path/to/config] [/path/to/twitter/creds]`

## Config options

#### "filterWords"
An array of strings used to filter incoming tweets (if a tweet contains any of the `filterWords`, it will be ignored).

#### "requiredWords"
An array of strings used to filter incoming tweets (if a tweet does not contain a `requiredWord`, it will be ignored).

#### "responses"
An array of strings used to tweet responses.

#### "rateLimit"
A minimum number of seconds to wait between tweets.

#### "reallyActuallyTweet"
Are you sure? The bot will run but wont actually tweet until `reallyActuallyTweet` is set to `true`.
