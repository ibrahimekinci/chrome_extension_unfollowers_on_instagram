console.log("Unfollowers for Instagram");
var debugMode = true;
var appStorageKeyNames =
{
    isloaderAnimationActive: "is_loader_animation_active",
    popup_page: {
        active_tab: 'active_tab',
        scroll_position_top: 'scroll_position_top',
    },
    user: 'user',
    friends: 'friends'
};

function clearStorage() {
    localStorage.clear();
    if (debugMode) console.log("clearStorage ended");
}

function setUser(value) {
    if (debugMode) console.log('setUser', value);
    json = '{}';
    try {
        if (!value) {
            value = {
                id: 0
            };
        }
        else if (!value.id) {
            value.id = 0;
        }

        json = value ? JSON.stringify(value) : {};
    } catch (err) {
        console.log('setUser has error', err);
    }
    finally {
        localStorage.setItem(appStorageKeyNames.user, json);
    }
}

function getUser() {
    var response = { id: 0 };
    var localData = localStorage.getItem(appStorageKeyNames.user);

    try {
        if (localData && localData.length > 0)
            response = JSON.parse(localData);

        if (response && !response.id)
            response.id = 0;

    } catch (err) {
        console.log('getUser has error', err);
    }
    finally {
        return response;
    }
}

//user model
//is_it_priority : [],
//is_it_ignored : [],
//is_it_lost : [],
//is_new :[],
//is_it_mutual : true,
//id : '',
//username: '',
//full_name: '',
//profile_pic_url: '',
//is_private: true,

function getFriends() {
    var localData = localStorage.getItem(appStorageKeyNames.friends);
    var response = {};

    try {
        if (localData && localData.length > 0)
            response = JSON.parse(localData);
    } catch (err) {
        console.log('getFriends has error', err);
    }
    finally {
        return response;
    }
}

function setFriends(value) {
    if (debugMode) console.log('setFriends', value);
    json = '{}';
    try {
        if (!value)
            value = {};
        json = value ? JSON.stringify(value) : {};
    } catch (err) {
        console.log('setFriends has error', err);
    }
    finally {
        localStorage.setItem(appStorageKeyNames.friends, json);
    }
}

// Resets scroll position to top (0)
async function resetScrollPosition() {
    await setScrollPositionTop(0);
    await restoreScrollPosition(0);
}

// Saves the current or given scroll position
async function setScrollPositionTop(top) {
    return new Promise(function (resolve) {
        if (typeof top === "undefined" || top === null) {
            top = $(document).scrollTop();
        }

        if (top > 100) {
            top = top - ($("#mainNav").height() || 0);
        }

        localStorage.setItem(appStorageKeyNames.popup_page.scroll_position_top, top);
        resolve();
    });
}

// Retrieves saved scroll position, defaults to 0
async function getScrollPositionTop() {
    return new Promise(function (resolve) {
        const value = localStorage.getItem(appStorageKeyNames.popup_page.scroll_position_top);
        if (value === null || isNaN(value)) {
            resolve(0);
        } else {
            resolve(parseInt(value, 10));
        }
    });
}

// Restores scroll position after a delay (default 200ms)
async function restoreScrollPosition(delayMs) {
    if (typeof delayMs === "undefined" || isNaN(delayMs)) {
        delayMs = 200;
    }

    try {
        const scrollTop = await getScrollPositionTop();
        setTimeout(() => {
            if (!isNaN(scrollTop)) {
                $(document).scrollTop(scrollTop);
            }
        }, delayMs);
    } catch (error) {
        console.error("restoreScrollPosition error:", error);
    }
}

// Save scroll position during scrolling — only if loader is not active
$(window).on("scroll", function () {
    if (localStorage.getItem(appStorageKeyNames.isloaderAnimationActive) !== "1") {
        setScrollPositionTop();
    }
});

// Displays the loader overlay and disables page interaction
async function showLoader() {
    try {
        localStorage.setItem(appStorageKeyNames.isloaderAnimationActive, "1");

        $("#loader").removeClass("d-none");
        $(".js-close-when-loader-is-open").addClass("d-none");
    } catch (error) {
        console.error("Error in showLoader:", error);
    }
}

// Hides loader overlay and restores scroll position
async function hideLoader() {
    $("#loader").addClass("d-none");
    $(".js-close-when-loader-is-open").removeClass("d-none");
    localStorage.setItem(appStorageKeyNames.isloaderAnimationActive, "0");
    await restoreScrollPosition();
}

// App-level initializer function
async function main_init() {
    if (debugMode) console.log('main_init');
}
