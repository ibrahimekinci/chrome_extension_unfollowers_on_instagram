if (debugMode) console.log("popup screen js start");

function sendMessageToActiveTab(message, onError) {
    chrome.tabs.query({
        currentWindow: true,
        active: true
    }, function (tabs) {
        var activeTab = tabs && tabs[0];
        if (!activeTab || !activeTab.id) {
            if (typeof onError === "function") onError();
            return;
        }
        chrome.tabs.sendMessage(activeTab.id, message, function () {
            if (chrome.runtime.lastError) {
                var errMsg = chrome.runtime.lastError.message || "";
                if (debugMode) console.log("sendMessage error:", errMsg);

                // If the Instagram tab was already open before the extension loaded,
                // reload the tab once so Chrome injects the content script, then retry.
                if (activeTab.url && activeTab.url.includes("instagram.com")) {
                    var tabId = activeTab.id;
                    var handled = false;
                    var timeoutId = setTimeout(function () {
                        if (handled) return;
                        handled = true;
                        chrome.tabs.onUpdated.removeListener(onTabUpdated);
                        if (typeof onError === "function") onError();
                    }, 15000);

                    function onTabUpdated(updatedTabId, changeInfo) {
                        if (updatedTabId === tabId && changeInfo.status === "complete") {
                            if (handled) return;
                            handled = true;
                            clearTimeout(timeoutId);
                            chrome.tabs.onUpdated.removeListener(onTabUpdated);
                            setTimeout(function () {
                                chrome.tabs.sendMessage(tabId, message, function () {
                                    if (chrome.runtime.lastError) {
                                        if (typeof onError === "function") onError();
                                    }
                                });
                            }, 500);
                        }
                    }

                    chrome.tabs.onUpdated.addListener(onTabUpdated);
                    chrome.tabs.reload(tabId);
                    return;
                }

                if (typeof onError === "function") onError();
            }
        });
    });
}

async function process_updated_lists(request) {
    if (debugMode) console.log('process_updated_lists', request);

    if (!request.result || !request.user_id || Number(request.user_id) <= 0 || !Array.isArray(request.followers) || !Array.isArray(request.followings)) {
        $("#divError").removeClass("d-none");
        await popup_screen_init();
        return;
    }

    var current_user = getUser();
    if (current_user.id != request.user_id) {
        clearStorage();
        var user = {
            id: request.user_id
        };
        setUser(user);
        current_user = user;
    }

    var saved_friends = getFriends();
    var friends = [];

    var receivedFollowers = request.followers;
    var receivedFollowings = request.followings;

    if (debugMode) console.log('current_user', current_user, 'saved_friends', saved_friends, 'receivedFollowers', receivedFollowers, 'receivedFollowings', receivedFollowings);

    //user model
    //follower -> ignored
    //follower -> priority
    //follower -> new
    //follower -> status

    //following -> ignored
    //following -> priority
    //following -> new
    //following -> status

    //id : '',
    //username: '',
    //full_name: '',
    //profile_pic_url: '',
    //is_private: true,

    function initFriend(friend) {
        var friendFromSavedFriends = null;

        if (saved_friends && saved_friends.length > 0)
            friendFromSavedFriends = saved_friends.find(function (item) {
                return item.id == friend.id;
            });

        if (debugMode) console.log('friendFromSavedFriends', friendFromSavedFriends);
        if (!friendFromSavedFriends) {
            friend.follower.ignored = false;
            friend.follower.priority = false;
            friend.follower.new = true;

            friend.following.ignored = false;
            friend.following.priority = false;
            friend.following.new = true;
        }
        else {
            friend.follower.ignored = friendFromSavedFriends.follower.ignored;
            friend.follower.priority = friendFromSavedFriends.follower.priority;
            friend.follower.new = !friendFromSavedFriends.follower.status && friend.follower.status;

            friend.following.ignored = friendFromSavedFriends.following.ignored;
            friend.following.priority = friendFromSavedFriends.following.priority;
            friend.following.new = !friendFromSavedFriends.following.status && friend.following.status;
        }

        return friend;
    }

    if (Array.isArray(receivedFollowers))
        receivedFollowers?.forEach(function (friend) {
            friend.follower = {};
            friend.following = {};

            friend.follower.status = true;

            friend.following.status = receivedFollowings.findIndex(function (item) {
                return item.id == friend.id;
            }) > -1;

            friend = initFriend(friend);

            friends.push(friend);
        });

    if (Array.isArray(receivedFollowings))
        receivedFollowings?.forEach(function (friend) {
            friend.follower = {};
            friend.following = {};

            friend.follower.status = friends.findIndex(function (item) {
                return item.id == friend.id;
            }) > -1;

            friend.following.status = true;

            if (friend.follower.status)
                return;

            friend = initFriend(friend);

            friends.push(friend);
        });

    if (debugMode) console.log('friends', friends);
    setFriends(friends);

    await popup_screen_init();

    $("#divError").addClass("d-none");
}

async function process_follow_result(request) {
    if (debugMode) console.log('process_follow_result', request);

    if (!request.result) {
        $("#divError").removeClass("d-none");
    }
    else {
        $("#divError").addClass("d-none");
        var user_id = request.user_id;
        var friends = getFriends();

        var friend_index = -1;
        if (friends && friends.length > 0)
            friend_index = friends.findIndex(function (item) { return item.id == user_id; });
        if (debugMode) console.log('friend_index', friend_index);

        if (friend_index > -1) {
            if (debugMode) console.log('friend', friends[friend_index]);
            friends[friend_index].following.status = true;
            setFriends(friends);
        }
        $(`#divList2 table tr[data-id="${user_id}"]`).addClass("bg-success");
    }
}

async function process_unfollow_result(request) {
    if (debugMode) console.log('process_unfollow_result', request);

    if (!request.result) {
        $("#divError").removeClass("d-none");
    }
    else {
        $("#divError").addClass("d-none");
        var user_id = request.user_id;
        var friends = getFriends();

        var friend_index = -1;
        if (friends && friends.length > 0)
            friend_index = friends.findIndex(function (item) { return item.id == user_id; });
        if (debugMode) console.log('friend_index', friend_index);

        if (friend_index > -1) {
            if (debugMode) console.log('friend', friends[friend_index]);
            friends[friend_index].following.status = false;
            setFriends(friends);
        }

        $(`#divList1 table tr[data-id="${user_id}"]`).addClass("bg-success");
    }
}



function whoDoNotFollowYouFriends() {
    if (debugMode) console.log('whoDoNotFollowYouFriends start');
    var response = [];
    var friends = getFriends();

    if (friends && Array.isArray(friends) && friends.length > 0) {
        friends = friends?.filter(
            x => !x.follower.status && x.following.status
        );
    }

    if (!friends || !Array.isArray(friends) || friends.length == 0) {
        return response;
    }

    //new
    var tmpNew = friends.filter(
        x => x.follower.new && !x.follower.ignored
    );

    if (tmpNew && Array.isArray(tmpNew) && tmpNew.length > 0)
        tmpNew.forEach(item => response.push(item));

    //normal
    var tmpNormal = friends.filter(
        x => !x.follower.new && !x.follower.ignored
    );

    if (tmpNormal && Array.isArray(tmpNormal) && tmpNormal.length > 0)
        tmpNormal.forEach(item => response.push(item));

    //ignore
    var tmpIgnore = friends.filter(
        x => x.follower.ignored
    );

    if (tmpIgnore && Array.isArray(tmpIgnore) && tmpIgnore.length > 0)
        tmpIgnore.forEach(item => response.push(item));

    if (debugMode) console.log('whoDoNotFollowYouFriends end', tmpNew, tmpNormal, tmpIgnore);
    return response;
}

function YouDoNotFollowFriends() {
    if (debugMode) console.log('YouDoNotFollowFriends start');
    var response = [];
    var friends = getFriends();

    if (friends && Array.isArray(friends) && friends.length > 0) {
        friends = friends?.filter(
            x => x.follower.status && !x.following.status
        );
    }

    if (!friends || !Array.isArray(friends) || friends.length == 0) {
        return response;
    }

    //new
    var tmpNew = friends.filter(
        x => x.following.new && !x.following.ignored
    );

    if (tmpNew && Array.isArray(tmpNew) && tmpNew.length > 0)
        tmpNew.forEach(item => response.push(item));

    //normal
    var tmpNormal = friends.filter(
        x => !x.following.new && !x.following.ignored
    );

    if (tmpNormal && Array.isArray(tmpNormal) && tmpNormal.length > 0)
        tmpNormal.forEach(item => response.push(item));

    //ignore
    var tmpIgnore = friends.filter(
        x => x.following.ignored
    );

    if (tmpIgnore && Array.isArray(tmpIgnore) && tmpIgnore.length > 0)
        tmpIgnore.forEach(item => response.push(item));

    if (debugMode) console.log('YouDoNotFollowFriends end', tmpNew, tmpNormal, tmpIgnore);
    return response;
}

function go_profile_click() {
    var $this = $(this);
    if (debugMode) console.log('go_profile', $this);

    var username = $this.parent().parent().data("username");

    var message = {
        process: 'go_profile',
        username: username
    };

    sendMessageToActiveTab(message);
}

async function list1_unfollow_row_click() {
    if (debugMode) console.log('list1_unfollow_row_click');

    await showLoader();

    var $this = $(this);
    var user_id = $this.parent().parent().data("id");

    var message = {
        process: 'unfollow',
        user_id: user_id
    };

    sendMessageToActiveTab(message, async function () {
        $("#divError").removeClass("d-none");
        await hideLoader();
    });
}

async function list2_follow_row_click() {
    if (debugMode) console.log('list2_follow_row_click');

    await showLoader();

    var $this = $(this);
    var user_id = $this.parent().parent().data("id");

    var message = {
        process: 'follow',
        user_id: user_id
    };

    sendMessageToActiveTab(message, async function () {
        $("#divError").removeClass("d-none");
        await hideLoader();
    });
}

async function list1_hide_row_click() {
    if (debugMode) console.log('list1_hide_row_click');

    await showLoader();

    var $this = $(this);
    var user_id = $this.parent().parent().data("id");
    var friends = getFriends();

    if (debugMode) console.log('$this', $this, 'user_id', user_id, 'friends', friends);

    var friend_index = -1;
    if (friends && friends.length > 0)
        friend_index = friends.findIndex(function (item) { return item.id == user_id; });
    if (debugMode) console.log('friend_index', friend_index);

    if (friend_index > -1) {
        if (debugMode) console.log('friend', friends[friend_index]);
        friends[friend_index].follower.ignored = true;
        setFriends(friends);
    }

    $this.parent().parent().remove();
    await hideLoader();
}

async function list2_hide_row_click() {
    if (debugMode) console.log('list2_hide_row_click');

    await showLoader();


    var $this = $(this);
    var user_id = $this.parent().parent().data("id");
    var friends = getFriends();

    if (debugMode) console.log('$this', $this, 'user_id', user_id, 'friends', friends);

    var friend_index = -1;
    if (friends && friends.length > 0)
        friend_index = friends.findIndex(function (item) { return item.id == user_id; });

    if (debugMode) console.log('friend_index', friend_index);

    if (friend_index > -1) {
        if (debugMode) console.log('friend', friends[friend_index]);
        friends[friend_index].following.ignored = true;
        setFriends(friends);
    }

    $this.parent().parent().remove();
    await hideLoader();
}

async function btnUpdateLists_click() {
    if (debugMode) console.log('btnUpdateLists_click');

    $("#divError").addClass("d-none");
    await showLoader();
    await resetScrollPosition();

    var message = {
        process: 'update_instagram_info'
    };

    sendMessageToActiveTab(message, async function () {
        $("#divError").removeClass("d-none");
        await hideLoader();
    });
}

async function btnReset_click() {
    if (debugMode) console.log('btnReset_click');

    await showLoader();
    clearStorage();

    await popup_screen_init();

    $("#divError").addClass("d-none");

    var $list1Body = $("#list1Body");
    var $list2Body = $("#list2Body");

    $list1Body.html('');
    $list2Body.html('');
    await hideLoader();
}

function fillLists() {
    if (debugMode) console.log('fillLists');

    let list1 = whoDoNotFollowYouFriends();
    let list2 = YouDoNotFollowFriends();

    if (debugMode) console.log('fillLists', 'list1', list1, 'list2', list2);

    var list1bodyVal = "";
    var list2bodyVal = "";

    if (list1 && list1.length > 0)
        $.each(list1, function (index, value) {
            list1bodyVal += `<tr data-id="${value.id}" data-username="${value.username}">`;
            list1bodyVal += '<th scope="row">';
            list1bodyVal += String(index + 1);
            list1bodyVal += "</th>";

            list1bodyVal += "<td>";
            list1bodyVal += "<span>@" + value.username + '</span>';
            list1bodyVal += "</td>";

            list1bodyVal += "<td>";
            list1bodyVal += '<span>' + value.full_name + '</span>';
            list1bodyVal += "</td>";

            list1bodyVal += "<td>";
            list1bodyVal += `<button type="button" class="js-go-profile btn btn-sm btn-info text-nowrap">see</button>`;
            list1bodyVal += `<button type="button" class="js-list1-ignore-row btn btn-sm btn-warning text-nowrap">ignore</button>`;
            list1bodyVal += `<button type="button" class="js-list1-unfollow-row btn btn-sm btn-danger text-nowrap">unfollow</button>`;
            list1bodyVal += "</td>";

            list1bodyVal += "</tr>";
        });

    if (list2 && list2.length > 0)
        $.each(list2, function (index, value) {
            list2bodyVal += `<tr data-id="${value.id}" data-username="${value.username}">`;

            list2bodyVal += '<th scope="row">';
            list2bodyVal += String(index + 1);
            list2bodyVal += "</th>";

            list2bodyVal += "<td>";
            list2bodyVal += '<span>@' + value.username + '</span>';
            list2bodyVal += "</td>";

            list2bodyVal += "<td>";
            list2bodyVal += '<span>' + value.full_name + '</span>';
            list2bodyVal += "</td>";

            list2bodyVal += "<td>";
            list2bodyVal += `<button type="button" class="js-go-profile btn btn-sm btn-info text-nowrap">see</button>`;
            list2bodyVal += `<button type="button" class="js-list2-ignore-row btn btn-sm btn-warning text-nowrap">ignore</button>`;
            list2bodyVal += `<button type="button" class="js-list2-follow-row btn btn-sm btn-danger text-nowrap">follow</button>`;
            list2bodyVal += "</td>";

            list2bodyVal += "</tr>";
        });

    var $list1Body = $("#list1Body");
    var $list2Body = $("#list2Body");

    $list1Body.html(list1bodyVal);
    $list2Body.html(list2bodyVal);
}



//activeTab
function getActiveTab() {
    var val = localStorage.getItem(appStorageKeyNames.popup_page.active_tab);

    if (!val)
        val = 'list1-tab';

    return val;
}

function setActiveTab() {
    if (debugMode) console.log('setActiveTab', $(this).attr("id"));

    localStorage.setItem(appStorageKeyNames.popup_page.active_tab, $(this).attr("id"));
}

//ActiveTab

async function goToTopAction() {
    //Get the button:
    var btnTop = document.getElementById("btnTop");

    // When the user scrolls down 20px from the top of the document, show the button
    window.onscroll = function () {
        scrollFunction()
    };

    function scrollFunction() {
        if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
            btnTop.style.display = "block";
        } else {
            btnTop.style.display = "none";
        }
    }

}


async function checkSiteInfo() {
    if (debugMode) console.log('checkSiteInfo');

    chrome.tabs.query({
        currentWindow: true,
        active: true,
    }, tabs => {
        var activeUrl = (tabs && tabs[0] && tabs[0].url) ? tabs[0].url : "";
        if (debugMode) console.log("active tab url", activeUrl);

        if (activeUrl.includes("instagram.com")) {
            $("#divWebSiteInfo").addClass("d-none");
            $("#btnUpdateLists").removeClass("d-none");
        } else {
            $("#divWebSiteInfo").removeClass("d-none");
            $("#btnUpdateLists").addClass("d-none");
        }
    });

}

async function popup_screen_init() {
    if (debugMode) console.log('popup_screen_init');
    await main_init();

    $('[id="' + getActiveTab() + '"]').tab('show');

    await checkSiteInfo();
    await goToTopAction();
    fillLists();
}

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (debugMode) console.log('chrome.runtime.onMessage.addListener', request, sender, sendResponse);

        (async function () {
            await showLoader();
            try {
                if (request && request.process == "updated_lists") {
                    if (debugMode) console.log('chrome.runtime.onMessage.addListener -> updated_lists');
                    await process_updated_lists(request);
                }
                else if (request && request.process == "follow_result") {
                    if (debugMode) console.log('chrome.runtime.onMessage.addListener -> follow_result');
                    if (!request.user_id || Number(request.user_id) <= 0) {
                        $("#divError").removeClass("d-none");
                    } else {
                        await process_follow_result(request);
                    }
                }
                else if (request && request.process == "unfollow_result") {
                    if (debugMode) console.log('chrome.runtime.onMessage.addListener -> unfollow_result');
                    if (!request.user_id || Number(request.user_id) <= 0) {
                        $("#divError").removeClass("d-none");
                    } else {
                        await process_unfollow_result(request);
                    }
                }
            } finally {
                await hideLoader();
            }
        })();

        if (typeof sendResponse === "function") {
            sendResponse({ received: true });
        }
        return false;
    });

$(document).on('click', '.js-go-profile', go_profile_click);
$(document).on('click', '.js-list1-ignore-row', list1_hide_row_click);
$(document).on('click', '.js-list2-ignore-row', list2_hide_row_click);
$(document).on('click', '.js-list1-unfollow-row', list1_unfollow_row_click);
$(document).on('click', '.js-list2-follow-row', list2_follow_row_click);
$(document).on('click', '.js-reset-scroll-position', resetScrollPosition);
$(document).on('click', '.nav-link', setActiveTab);

$("#btnUpdateLists").click(btnUpdateLists_click);
$("#btnReset").click(btnReset_click);


$(document).ready(function () {
    popup_screen_init().then(async function () {
        hideLoader();
        restoreScrollPosition();
    });
});


if (debugMode) console.log("popup screen js end");