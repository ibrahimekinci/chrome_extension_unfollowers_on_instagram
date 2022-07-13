if (debugMode) console.log("popup screen js start");

chrome.runtime.onMessage.addListener(
    async function (request, sender, sendResponse) {
        if (debugMode) console.log('chrome.runtime.onMessage.addListener', request, sender, sendResponse);
        showLoader();
        if (request.process = "updated_lists") {
            if (debugMode) console.log('chrome.runtime.onMessage.addListener -> updated_lists');

            if (!request.user_id || request.user_id <= 0)
                return;

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

            if (request.result) {
                $("#divError").addClass("d-none");
            } else {
                $("#divError").removeClass("d-none");
            }
        }
        hideLoader();
    });


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

    var username = $this.data("username");

    var message = {
        process: 'go_profile',
        username: username
    };

    chrome.tabs.query({
        currentWindow: true,
        active: true
    }, function (tabs) {
        var activeTab = tabs[0];
        chrome.tabs.sendMessage(activeTab.id, message);
    });
}


function btnUpdateLists_click() {
    if (debugMode) console.log('btnUpdateLists_click');
    showLoader();

    var message = {
        process: 'update_instagram_info'
    };

    chrome.tabs.query({
        currentWindow: true,
        active: true
    }, function (tabs) {
        var activeTab = tabs[0];
        chrome.tabs.sendMessage(activeTab.id, message);
    });
}

async function btnReset_click() {
    if (debugMode) console.log('btnReset_click');

    showLoader();
    clearStorage();
    await popup_screen_init();

    $("#divError").addClass("d-none");

    var $list1Body = $("#list1Body");
    var $list2Body = $("#list2Body");

    $list1Body.html('');
    $list2Body.html('');
    hideLoader();
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
            list1bodyVal += "<tr>";
            list1bodyVal += '<th scope="row">';
            list1bodyVal += String(index + 1);
            list1bodyVal += "</th>";

            list1bodyVal += "<td>";
            list1bodyVal += "@" + value.username;
            list1bodyVal += "</td>";

            list1bodyVal += "<td>";
            list1bodyVal += value.full_name;
            list1bodyVal += "</td>";

            list1bodyVal += "<td>";
            //list1bodyVal += `<img class="js-go-profile text-nowrap" alt="go profile" data-username="${value.username}" src="${value.profile_pic_url}" />`;
            list1bodyVal += `<button type="button" class="js-go-profile btn btn-sm btn-info text-nowrap" data-username="${value.username}">go profile</button>`;
            list1bodyVal += `<button type="button" class="js-list1-ignore_row btn btn-sm btn-danger text-nowrap" data-id="${value.id}">ignore</button>`;
            list1bodyVal += "</td>";

            list1bodyVal += "</tr>";
        });

    if (list2 && list2.length > 0)
        $.each(list2, function (index, value) {
            list2bodyVal += "<tr>";

            list2bodyVal += '<th scope="row">';
            list2bodyVal += String(index + 1);
            list2bodyVal += "</th>";

            list2bodyVal += "<td>";
            list2bodyVal += "@" + value.username;
            list2bodyVal += "</td>";

            list2bodyVal += "<td>";
            list2bodyVal += value.full_name;
            list2bodyVal += "</td>";

            list2bodyVal += "<td>";
            list2bodyVal += `<button type="button" class="js-go-profile btn btn-sm btn-info text-nowrap" data-username="${value.username}">go profile</button>`;
            list2bodyVal += `<button type="button" class="js-list2-ignore_row btn btn-sm btn-danger text-nowrap" data-id="${value.id}">ignore</button>`;
            list2bodyVal += "</td>";

            list2bodyVal += "</tr>";
        });

    var $list1Body = $("#list1Body");
    var $list2Body = $("#list2Body");

    $list1Body.html(list1bodyVal);
    $list2Body.html(list2bodyVal);
}

function list1_hide_row_click() {
    if (debugMode) console.log('list1_hide_row_click');

    showLoader();
    var $this = $(this);
    var user_id = $this.data("id");
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
    hideLoader();
}

function list2_hide_row_click() {
    if (debugMode) console.log('list2_hide_row_click');

    showLoader();
    var $this = $(this);
    var user_id = $this.data("id");
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
    hideLoader();
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
//scroll
async function getScrollPositionTop() {
    return localStorage.getItem(appStorageKeyNames.popup_page.scroll_position_top)
}

async function setScrollPositionTop(top) {

    if (!top) {
        top = $(document).scrollTop();
    }
    localStorage.setItem(appStorageKeyNames.popup_page.scroll_position_top, top);
}


function resetScrollPosition() {
    document.body.scrollTop = 0; // For Safari
    document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
    setScrollPositionTop();
}

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


async function rememberScrollPosition() {
    // If cookie is set, scroll to the position saved in the cookie.
    let scrollTop = await getScrollPositionTop();
    if (debugMode) console.log('scrollTop', scrollTop);
    if (scrollTop !== null) {
        scrollTop = parseInt(scrollTop, 10);

        if (scrollTop > 100)
            scrollTop = scrollTop - ($("#mainNav").height());

        $(document).scrollTop(scrollTop);
    }

    // When scrolling happens....
    $(window).on("scroll", function () {
        setScrollPositionTop();
    });
}

//scroll

async function checkSiteInfo() {
    if (debugMode) console.log('checkSiteInfo');

    chrome.tabs.query({
        active: true,
    }, tabs => {
        if (debugMode) console.log("active tab url", tabs[0].url);

        if (tabs[0].url.includes("instagram.com")) {
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
    var user = getUser();
    if (user.id > 0) {
        fillLists();
    }

    $('[id="' + getActiveTab() + '"]').tab('show');

    await checkSiteInfo();
    await rememberScrollPosition();
    await goToTopAction();
    fillLists();
}


$(document).on('click', '.js-go-profile', go_profile_click);
$(document).on('click', '.js-list1-ignore_row', list1_hide_row_click);
$(document).on('click', '.js-list2-ignore_row', list2_hide_row_click);
$(document).on('click', '.js-reset-scroll-position', resetScrollPosition);
$(document).on('click', '.nav-link', setActiveTab);

$("#btnUpdateLists").click(btnUpdateLists_click);
$("#btnReset").click(btnReset_click);

$(document).ready(function () {
    popup_screen_init().then(function () {
        hideLoader();
    });
});

if (debugMode) console.log("popup screen js end");