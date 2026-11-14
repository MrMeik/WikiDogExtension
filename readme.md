# Project Goal

This extension aims to automate the collection of data from various activities in DogOnline. The collected data is sent to a central backend server to be entered into a google sheet for aggregation on the wiki. This functionality is modeled after the [WikiSync](https://oldschool.runescape.wiki/w/RuneScape:WikiSync) plugin used to determine drop chances for the Runescape wiki.

## How to use

Once you install the extension it will begin logging information to your console only. To begin sending data to the backend server, you will need to request an API key. Then you will need to click on the extension icon and click options to be brought to a page where you can enter your API key. At this point, you can just continue playing the game like normal. Your actions will automatically be sent to the google sheet.

## What is tracked and where can it be found

This version of the extension tracks interactions with the Tower (including Mobs and Chests), Gachapon, Suspicious Bush, Treat or Get Blown Up and the Giant Cactus. The data is uploaded to this [google sheet](https://docs.google.com/spreadsheets/d/1SDBlNBxuKEcM4mcVM6eR3U7lMW6jObvjGunr-V6KZ1o/edit?usp=sharing).

## Installing the extension

Supported platform are current chrome and firefox on desktop as well as firefox on mobile

- Chrome - Desktop [Guide](docs/supported_platforms/chrome-desktop.md)
- Firefox - Desktop [Guide](docs/supported_platforms/firefox-desktop.md)
- Firefox - Android [Guide](docs/supported_platforms/firefox-android.md)

## Looking to contribute?

One of my goals in creating this extension is to make the process of tracking a new aspect of DogOnline as easy as possible. I'll be working on a developer onboarding guide as time goes on but for the moment I can provide a high-level explanation.

Overall, the application is made up of a bunch of trackers that each focus on logging information about different activities in the game. Wrapping around the trackers is the core application which is responsible for routing requests to the trackers as well sending off noteworthy logs to a network background service. This background service is built to ensure the records eventually reach the backend for storage and aggregation for the wiki.

The application can be conceptually broken up into 4 main parts by the folder structure:

- `src/page` contains the main page hook which wraps the fetching logic the game uses to pass into lower layers
- `src/trackers` contains the trackers which declare which tRCP procedures they're interested in a handler to log information when they occur.
- `src/core` the core application which handles routing fetch requests to the appropriate tracker and handing off logged game interactions to the transport layer
- `scr/uploading` a background service worker which recieves messages to send off, queues them up with an outbox and posts them to the backend

### Developing a new tracker

Start with the `tracker.example.ts` as a template. When creating a tracker, first decide on which tRCP methods needs to be tracked to get information required for the logs. You can then define a handler that should attempt to parse the network requests into the format you are expecting (see the other trackers for examples, namely `togbu.ts` as it's pretty brief). Whatever values you return in the array will be sent off to the backend server. You can use the `api` passed into the trackers constructor to access application wide features. Notably, it contains methods to store context across calls in a global fashion. The weather is persisted this way so the fishing tracker can gain access to it. Finally, ensure that the file contains `export const tracker` or it will not be properly included in the built extension.
