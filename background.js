let color = "#cccf90"

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({
        color
    });
    console.log("Unfollowers for Instagram started");
});