console.log("popup screen js start");

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        console.log('chrome.runtime.onMessage.addListener', request, sender, sendResponse);
        if (request.process = "updated_lists") {
            console.log('chrome.runtime.onMessage.addListener -> updated_lists');
            setFollowers(request.followers);
            setFollowings(request.followings);
            popup_screen_init();

            $("#divLoading").addClass("d-none");

            if (request.result) {
                $("#divError").addClass("d-none");
            } else {
                $("#divError").removeClass("d-none");
            }

        }
    });

function go_profile_click() {
    var $this = $(this);
    console.log('go_profile', $this);

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
    console.log('btnUpdateLists_click');

    var message = {
        process: 'update_instagram_info',
        username: app.username.val
    };

    chrome.tabs.query({
        currentWindow: true,
        active: true
    }, function (tabs) {
        var activeTab = tabs[0];
        chrome.tabs.sendMessage(activeTab.id, message);
    });


    $("#divLoading").removeClass("d-none");
}

function btnReset_click() {
    setUserName('');
    setFollowers([]);
    setFollowings([]);
    setList1HideRows([]);
    setList2HideRows([]);
    popup_screen_init();
    $("#divError").addClass("d-none");
}

function mainbtngroup_click() {
    var $this = $(this);
    console.log('mainbtngroup_click', $this);

    var activelist = $this.data("active-list");

    $("#mainbtngroup button").removeAttr('checked');
    $this.attr('checked');

    $(".js-div-list").hide();
    $(activelist).slideDown();

}

$("#mainbtngroup button").click(mainbtngroup_click);

function fillTxtUserName() {
    chrome.storage.local.get('instagram_username', function (data) {
        var $username = $("#txtUserName");
        $username.val(data.instagram_username);
    });
}

function validateForm() {
    var $username = $("#txtUserName");
    console.log("Options page username", $username);

    var retVal = false;

    if (!$username || !$username.val() || $username.val().length < 1) {
        $username.addClass("is-invalid");
        $username.removeClass("is-valid");
        retVal = false;

    } else {
        $username.removeClass("is-invalid");
        $username.addClass("is-valid");
        retVal = true;
    }

    return retVal;
}

function btnUpdateOptions_click() {
    if (validateForm()) {
        var username = $("#txtUserName").val();
        setUserName(username);
        fillTxtUserName();
        main_init();
        popup_screen_init();
        $("#divError").addClass("d-none");
    }
}

function fillLists() {
    console.log('fillLists');

    let list1 = app.followings.val.filter(
        x => app.followers.val.filter(y => y.username == x.username) == 0
    );

    console.log('app.list1_hide_rows', app.list1_hide_rows);
    if (app.list1_hide_rows && app.list1_hide_rows.length > 0) {
        console.log("hide rows");
        list1 = list1.filter(
            x => app.list1_hide_rows.filter(y => y.username == x.username) == 0
        );
    }

    let list2 = app.followers.val.filter(x => app.followings.val.filter(y => y.username == x.username) == 0 && app.list2_hide_rows.filter(z => z.username == x.username) == 0);

    console.log('fillLists', 'list1', list1, 'list2', list2);

    var $list1Body = $("#list1Body");
    var $list2Body = $("#list2Body");

    var list1bodyVal = "";
    var list2bodyVal = "";

    // js-list1-hide-row
    if (list1)
        $.each(list1, function (index, value) {
            list1bodyVal += '<tr><td>@' + value.username + '</td><td>' + value.full_name + '</td><td><button type="button" class="js-go-profile btn btn-sm btn-primary text-nowrap" data-username="' + value.username + '">go profile</button><button type="button" class="js-list1-hide-row btn btn-sm btn-danger text-nowrap" data-username="' + value.username + '">hide row</button></td></tr>';
        });

    //js-list1-hide-row
    if (list2)
        $.each(list2, function (index, value) {
            list2bodyVal += '<tr><td>@' + value.username + '</td><td>' + value.full_name + '</td><td><button type="button" class="js-go-profile btn btn-sm btn-primary text-nowrap" data-username="' + value.username + '">go profile</button><button type="button" class="js-list2-hide-row btn btn-sm btn-danger text-nowrap" data-username="' + value.username + '">hide row</button></td></tr>';
        });

    $list1Body.html(list1bodyVal);
    $list2Body.html(list2bodyVal);
}

function list1_hide_row_click() {
    var $this = $(this);

    var username = $this.data("username");
    console.log('.js-list1-hide-row', '$this', $this, 'username', username);

    var user = app.followings.val.filter(x => x.username == username);

    console.log('.js-list1-hide-row -> user', user);

    if (user && user.length > 0) {
        app.list1_hide_rows.push(user[0]);

        setList1HideRows(app.list1_hide_rows);

        $this.parent().parent().remove();
    }
}

function list2_hide_row_click() {
    var $this = $(this);
    var username = $this.data("username");
    console.log('.js-list2-hide-row', '$this', $this, 'username', username);

    var user = app.followers.val.filter(x => x.username == username);
    console.log('.js-list2-hide-row -> user', user);

    if (user && user.length > 0) {
        app.list2_hide_rows.push(user[0]);

        setList2HideRows(app.list2_hide_rows);

        $this.parent().parent().remove();
    }
}


async function popup_screen_init() {
    await main_init();

    // setTimeout(function () {
    console.log('popup_screen_init');
    $("#divLoading").addClass("d-none");

    if (app.username.val.length < 1) {
        $("#btnUpdateLists").addClass("d-none");
        $("#btnReset").addClass("d-none");

        $("#divNoConfig").removeClass("d-none");

        $("#titleUserName").html('@NoUser');
    } else {
        $("#btnUpdateLists").removeClass("d-none");
        $("#btnReset").removeClass("d-none");

        $("#divNoConfig").addClass("d-none");
        $("#titleUserName").html('@' + app.username.val);
        fillLists();
    }

    chrome.tabs.query({
        active: true,
    }, tabs => {
        console.log("active tab url", tabs[0].url);

        if (tabs[0].url.includes("instagram.com")) {
            $("#divWebSiteInfo").addClass("d-none");
        } else {
            $("#divWebSiteInfo").removeClass("d-none");
            $("#btnUpdateLists").addClass("d-none");
        }
    });

    console.log('app', app);
    // }, 1000);
}


$(document).on('click', '.js-go-profile', go_profile_click);
$(document).on('click', '.js-list1-hide-row', list1_hide_row_click);
$(document).on('click', '.js-list2-hide-row', list2_hide_row_click);

$("#btnUpdateLists").click(btnUpdateLists_click);
$("#btnReset").click(btnReset_click);
$("#btnUpdateOptions").click(btnUpdateOptions_click);

$(document).ready(function () {
    console.log('popup_screen_init ready app', app);
    popup_screen_init();
});

console.log("popup screen js end");