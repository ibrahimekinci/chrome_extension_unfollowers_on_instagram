chrome.runtime.onInstalled.addListener(() => {
    console.log("Unfollowers on Instagram started");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (typeof sendResponse === "function") {
        sendResponse({ received: true });
    }
    return false;
});