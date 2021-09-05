console.log("main js start");

var app = {
    locationIsValid: false,
    username: {
        val: '',
        fillStatus: false
    },

    followers: {
        val: '',
        fillStatus: false
    },

    followings: {
        val: '',
        fillStatus: false
    }
};

async function setUserName(username) {
    localStorage.setItem('instagram_username', username);
    await chrome.storage.sync.set({
        'instagram_username': username,
        function () {
            close();
        }

    });

    setFollowers([]);
    setFollowings([]);
}

async function setFollowers(followers) {

    console.log('setFollowers', followers);
    followers = followers ? JSON.stringify(followers) : [];
    localStorage.setItem('instagram_followers', followers);
    // await chrome.storage.local.set({
    //     'instagram_followers': followers,
    //     function () {
    //         close();
    //     }
    // });
}

async function setFollowings(followings) {
    console.log('setFollowings', followings);
    followings = followings ? JSON.stringify(followings) : [];
    localStorage.setItem('instagram_followings', followings);
    // await chrome.storage.local.set({
    //     'instagram_followings': followings,
    //     function () {
    //         close();
    //     }
    // });
}

async function fillUserName() {

    var localData = localStorage.getItem('instagram_username');
    app.username.val = localData && localData.length > 0 ? localData : '';
    app.username.fillStatus = true;

    await chrome.storage.sync.get('instagram_username', function (data) {
        console.log('instagram_username', data);
        data.instagram_username = data.instagram_username && data.instagram_username.length > 0 ? data.instagram_username : '';
        app.username.val = data.instagram_username;
        localStorage.setItem('instagram_username', app.username.val);
    });
}

async function fillFollowers() {

    var data = JSON.parse(localStorage.getItem('instagram_followers'));

    console.log('instagram_followers', data);

    app.followers.fillStatus = true;

    app.followers.val = data && data.length > 0 ? data : [];

}

async function fillFollowings() {
    var data = JSON.parse(localStorage.getItem('instagram_followings'));

    console.log('instagram_followings', data);

    app.followings.fillStatus = true;
    app.followings.val = data && data.length > 0 ? data : [];

}

async function main_init() {
    fillUserName();
    fillFollowers();
    fillFollowings();
}

console.log("main js end");