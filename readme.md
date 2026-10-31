# Project Goal

This extension aims to automate the collection of data from various activities in DogOnline. The collected data is sent to a central backend server to be entered into a google sheet for aggregation on the wiki. This functionality is modeled after the [WikiSync](https://oldschool.runescape.wiki/w/RuneScape:WikiSync) plugin used to determine drop chances for the Runescape wiki.

## How to use

Once you install the extension it will begin logging information to your console only. To begin sending data to the backend server, you will need to request an API key. Then you will need to click on the extension icon and click options to be brought to a page where you can enter your API key. At this point, you can just continue playing the game like normal. Your actions will automatically be sent to the google sheet.

## Installing the extension

Supported platform are current chrome and firefox on desktop as well as firefox on mobile

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

Each tracker (found in the `/trackers` directory) declares a list of trpc procedures it's interested in listening to and registers a handler to response to these calls when they happen. The handler can analyze the request and response body to decide if the data is worth logging to the backend. Creating a new tracked trpc call requires only adding a new file in the `/trackers` directory and adding it to the manifest. The core extension files handle the rest of the boilerplate required to route the calls to the trackers.

On startup, the `hook.js` file creates a wrapper around all fetch calls made by the client. As each tracker file is imported it registers to the global file using the methods created in the `namespace.js` file. Once all trackers have been registered, `bridge.js` calls back to the event listener created in the initial hook which begins sending tracked trcp calls to the various trackers. When a record is emitted, it is sent out to a background service whose job it is to send it to the backend API. To ensure the record eventually gets to the backend it is first written to an outbox table.
