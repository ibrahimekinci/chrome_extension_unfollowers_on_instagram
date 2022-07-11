console.log("Unfollowers for Instagram");
var appStorageKeyNames =
{
    popup_page: {
        active_tab: 'active_tab',
        scroll_position_top: 0,
    },
    user: 'user',
    friends: 'friends'
};

function clearStorage() {
    localStorage.clear();
    console.log("clearStorage ended");
}

function setUser(value) {
    console.log('setUser', value);
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
    console.log('setFriends', value);
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

function showLoader() {
    $("#loader").removeClass("d-none");
    $(".js-close-when-loader-is-open").addClass("d-none");
}

function hideLoader() {
    $("#loader").addClass("d-none");
    $(".js-close-when-loader-is-open").removeClass("d-none");
}

async function main_init() {
   
}