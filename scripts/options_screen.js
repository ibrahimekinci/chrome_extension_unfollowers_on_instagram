console.log("options screen js start");

function fillTxtUserName() {
    chrome.storage.sync.get('instagram_username', function (data) {
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
    }
}

function options_screen_init() {
    fillTxtUserName();
}

$("#btnUpdateOptions").click(btnUpdateOptions_click);

$(document).ready(function () {
    main_init();
    options_screen_init();
});

console.log("options screen js end");