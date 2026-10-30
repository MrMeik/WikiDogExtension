# Project Goal

This extension aims to automate the collection of data from various activities in DogOnline. The collected data is sent to a central backend server to be entered into a google sheet for aggregation on the wiki. This functionality is modeled after the [WikiSync](https://oldschool.runescape.wiki/w/RuneScape:WikiSync) plugin used to determine drop chances for the Runescape wiki.

## How to use

Once you install the extension it will begin logging information to you console only. To begin sending data to the backend server, you will need to request an API key. Then you will need to click on the extension icon and click options to be brought to a page where you can enter your API key. At this point, you can just continue playing the game like normal. Your actions will automatically be sent to the the google sheet.

## Looking to contribute?

One of my goals creating this extension is to make the process of tracking a new aspect of DogOnline as easy as possible. I'll be working on a developer onboarding guide as time goes on but for the moment I can provide a high-level explaination.

Each tracker (found in the `/trackers` directory) declairs a list of trpc procedures it's interesting in listening to and registers a handler to response to these calls when they happen. The handler can analyze the request and response body to decide if the data is worth logging to the backend. Creating a new tracked trpc calls requires only adding a new file in the `/trackers` directory and adding it to the manifest. The core extension files handle the rest of the boilerplate required to route the calls to the trackers.

On startup, the `hook.js` file creates a wrapper around all fetch calls made by the client. As each tracker file is imported it registers to the global file using the methods created in the `namespace.js` file. Once all trackers have been registered, `bridge.js` calls back to the event listener created in the initial hook with begins sending tracked trcp calls to the various trackers. When a record is emitted, (note dispatcher here) it is sent out to a background service whose job it is to send it to the backend API. To ensure the record eventually gets to the backend it is first written to an outbox table.
