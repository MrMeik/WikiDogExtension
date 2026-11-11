# Project Goal

This extension aims to automate the collection of data from various activities in DogOnline. The collected data is sent to a central backend server to be entered into a google sheet for aggregation on the wiki. This functionality is modeled after the [WikiSync](https://oldschool.runescape.wiki/w/RuneScape:WikiSync) plugin used to determine drop chances for the Runescape wiki.

## How to use

Once you install the extension it will begin logging information to your console only. To begin sending data to the backend server, you will need to request an API key. Then you will need to click on the extension icon and click options to be brought to a page where you can enter your API key. At this point, you can just continue playing the game like normal. Your actions will automatically be sent to the google sheet.

## What is tracked and where can it be found

This version of the extension tracks Mob kills, Chest opens, Gachapon opens and Fishing caches. The data is uploaded to this [google sheet](https://docs.google.com/spreadsheets/d/1SDBlNBxuKEcM4mcVM6eR3U7lMW6jObvjGunr-V6KZ1o/edit?usp=sharing).

## Installing the extension

Supported platform are current chrome and firefox on desktop as well as firefox on mobile

### Chrome Desktop Installation

1. Download the latest Chrome release in the [releases section](https://github.com/MrMeik/WikiDogExtension/releases) and unzip the zipped folder.
2. Navigate to the extensions page at `chrome://extensions`.
3. Enable `Developer mode` via the toggle in the top right corner of the page.
4. Click `Load unpacked` to and select the folder you unzipped in step 1.
5. Click the `Details` button and then the `Extension options` button to be brought to a page to enter your API key.
6. Paste in your token and click `Save token` to complete setup.
7. Refresh your DogOnline page and your gameplay statistics will now be reported automatically.

### Firefox Mobile Installation

1. Download the latest firefox release from the [releases section](https://github.com/MrMeik/WikiDogExtension/releases) on Github.
2. Next, you will need to `enable developer mode` in firefox. First open up firefox on mobile and click the `triple dots icon` to open the Firefox menu and select the `Settings` option.
3. Click on the `About Firefox` option from the settings menu.
4. Tap the `Firefox Logo` 5 times in succession to `enable developer mode`. You should see a message at the bottom of the screen to indicate success and will also now see more options in your settings menus.
5. Go back to `Settings` and click `Install extension from file` from under the `Advanced` options section.
6. Select the downloaded release `.xpi` file and click `Add` when prompted. You will then be brought to the WikiDog extension page.
7. You will now need input your API token (currently API tokens must be requested directly from MrMeik) to begin sending data to the backend. To do so, click the `Settings` button on the WikiDog extension page to be brought to a page where you can enter your API token. `Paste in your token` and press `Save token`.
8. Under the `Pemissions` menu on the WikiDog extension page ensure each optional permission is selected.
9. You should now be able to play DogOnline like normal and gameplay statistics will be reported automatically.

#### Debugging Steps

- If you need to access the settings for the WikiDog extension again, click the `triple dots icon` and click the `extensions` option to see your installed extensions. `WikiDog` can be found in the list there.
- Ensure that you have saved your API token for the extension after installation. Follow step 7 for details.
- Under the `Permissions` menu in the WikiDog extension page, ensure that both of the optional permissions are enabled as data can only be sent to the backend if the `wikidogbackend` url is enabled.

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
