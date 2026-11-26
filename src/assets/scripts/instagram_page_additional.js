console.log("Unfollowers for Instagram - scripts added to page ");
var debugMode = false;

var IG_DEFAULT_APP_ID = "936619743392459";
var IG_DEFAULT_ASBD_ID = "129477";
var FOLLOWER_QUERY_HASHES = [
  "c76146de99bb02f6415203be841dd25a",
  "37479f2b8209594dde7facb0d904896a"
];
var FOLLOWING_QUERY_HASHES = [
  "3dec7e2c57367ef3da3d987d89f9dbc8",
  "d04b0a864b4b54837c0d870b0e77e076"
];

function delay(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function sendUpdatedLists(result, user_id, followers, followings) {
  var message = {
    process: 'updated_lists',
    result: result,
    user_id: user_id,
    followers: followers,
    followings: followings
  };

  chrome.runtime.sendMessage(message, function () {
    void chrome.runtime.lastError;
  });
}

function sendGenericMessage(process, result, user_id) {
  var message = {
    process: process,
    result: result,
    user_id: user_id
  };

  chrome.runtime.sendMessage(message, function () {
    void chrome.runtime.lastError;
  });
}

function getCookie(cname) {
  var name = cname + "=";
  var rawCookie = document.cookie || "";
  var ca = rawCookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      var rawVal = c.substring(name.length, c.length);
      try {
        return decodeURIComponent(rawVal);
      } catch (e) {
        return rawVal;
      }
    }
  }
  return "";
}

function getIgAppId() {
  try {
    var html = document.documentElement ? document.documentElement.innerHTML : "";
    var match = html.match(/"X-IG-App-ID"\s*:\s*"(\d+)"/) || html.match(/"APP_ID"\s*:\s*"(\d+)"/);
    if (match && match[1]) {
      return match[1];
    }
  } catch (e) {
    if (debugMode) console.log("getIgAppId error", e);
  }
  return IG_DEFAULT_APP_ID;
}

function getPageSecurityTokens() {
  var fbDtsg = "";
  var jazoest = "";
  try {
    var html = document.documentElement ? document.documentElement.innerHTML : "";
    var match =
      html.match(/"DTSGInitialData"\s*,\s*\[\]\s*,\s*\{\s*"token"\s*:\s*"([^"]+)"/) ||
      html.match(/"fb_dtsg"\s*:\s*\{\s*"token"\s*:\s*"([^"]+)"/) ||
      html.match(/name="fb_dtsg"\s+value="([^"]+)"/);
    if (match && match[1]) {
      fbDtsg = match[1];
      var sum = 0;
      for (var i = 0; i < fbDtsg.length; i++) {
        sum += fbDtsg.charCodeAt(i);
      }
      jazoest = "2" + String(sum);
    }
  } catch (e) {
    if (debugMode) console.log("getPageSecurityTokens error", e);
  }
  return {
    fbDtsg: fbDtsg,
    jazoest: jazoest
  };
}

function getInstagramHeaders(isFormPost) {
  var csrftoken = getCookie("csrftoken");
  var wwwClaim = "0";
  try {
    wwwClaim = sessionStorage.getItem("www-claim-v2") || "0";
  } catch (e) {
    wwwClaim = "0";
  }

  var headers = {
    "Accept": "*/*",
    "X-IG-App-ID": getIgAppId(),
    "X-ASBD-ID": IG_DEFAULT_ASBD_ID,
    "X-IG-WWW-Claim": wwwClaim,
    "X-Requested-With": "XMLHttpRequest"
  };

  if (csrftoken) {
    headers["X-CSRFToken"] = csrftoken;
  }

  if (isFormPost) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  return headers;
}

function normalizeUserNode(user) {
  if (!user) return null;
  var rawId = user.pk_id !== undefined && user.pk_id !== null
    ? user.pk_id
    : (user.pk !== undefined && user.pk !== null ? user.pk : user.id);
  if (rawId === undefined || rawId === null || rawId === "") {
    return null;
  }
  return {
    id: String(rawId),
    username: user.username || "",
    full_name: user.full_name || "",
    profile_pic_url: user.profile_pic_url || "",
    is_private: Boolean(user.is_private)
  };
}

async function fetch_friendships_v1(listType, userId) {
  var users = [];
  var seenIds = new Set();
  var seenCursors = new Set();
  var nextMaxId = null;
  var hasMore = true;

  while (hasMore) {
    var url = `https://www.instagram.com/api/v1/friendships/${encodeURIComponent(userId)}/${listType}/?count=50&search_surface=follow_list_page`;
    if (nextMaxId) {
      url += `&max_id=${encodeURIComponent(nextMaxId)}`;
    }

    var response = await fetch(url, {
      method: "GET",
      headers: getInstagramHeaders(false),
      credentials: "same-origin"
    });

    var isJson = response.headers.get("content-type")?.includes("application/json");
    if (!response.ok || !isJson) {
      throw new Error(`friendships v1 ${listType} failed with status ${response.status}`);
    }

    var data = await response.json();
    if (!data || data.status === "fail" || !Array.isArray(data.users)) {
      throw new Error(`friendships v1 ${listType} returned invalid payload`);
    }

    for (var i = 0; i < data.users.length; i++) {
      var normalized = normalizeUserNode(data.users[i]);
      if (normalized && !seenIds.has(normalized.id)) {
        seenIds.add(normalized.id);
        users.push(normalized);
      }
    }

    var cursor = data.next_max_id !== undefined && data.next_max_id !== null && String(data.next_max_id).length > 0
      ? String(data.next_max_id)
      : null;

    if (cursor && !seenCursors.has(cursor) && data.big_list !== false) {
      seenCursors.add(cursor);
      nextMaxId = cursor;
      await delay(150);
    } else {
      hasMore = false;
    }
  }

  return users;
}

async function fetch_friendships_graphql(queryHash, edgeName, userId) {
  var users = [];
  var seenIds = new Set();
  var seenCursors = new Set();
  var hasNext = true;
  var after = null;

  while (hasNext) {
    var variables = JSON.stringify({
      id: String(userId),
      include_reel: true,
      fetch_mutual: true,
      first: 50,
      after: after
    });

    var response = await fetch(
      `https://www.instagram.com/graphql/query/?query_hash=${encodeURIComponent(queryHash)}&variables=${encodeURIComponent(variables)}`,
      {
        method: "GET",
        headers: getInstagramHeaders(false),
        credentials: "same-origin"
      }
    );

    var isJson = response.headers.get("content-type")?.includes("application/json");
    if (!response.ok || !isJson) {
      throw new Error(`GraphQL ${edgeName} failed with status ${response.status}`);
    }

    var res = await response.json();
    var edgeObj = res && res.data && res.data.user && res.data.user[edgeName];
    if (!edgeObj || !edgeObj.page_info || !Array.isArray(edgeObj.edges)) {
      throw new Error(`GraphQL ${edgeName} missing edge data`);
    }

    for (var i = 0; i < edgeObj.edges.length; i++) {
      var edge = edgeObj.edges[i];
      var normalized = normalizeUserNode(edge && edge.node);
      if (normalized && !seenIds.has(normalized.id)) {
        seenIds.add(normalized.id);
        users.push(normalized);
      }
    }

    var nextCursor = edgeObj.page_info.end_cursor ? String(edgeObj.page_info.end_cursor) : null;
    if (edgeObj.page_info.has_next_page && nextCursor && !seenCursors.has(nextCursor)) {
      seenCursors.add(nextCursor);
      after = nextCursor;
      await delay(150);
    } else {
      hasNext = false;
    }
  }

  return users;
}

async function async_get_followers(query_hash, userId) {
  if (debugMode) console.log('async_get_followers started');

  try {
    var followers = await fetch_friendships_v1("followers", userId);
    if (debugMode) console.log('async_get_followers completed via v1', followers.length);
    return followers;
  } catch (v1Err) {
    if (debugMode) console.log('async_get_followers v1 fallback to graphql', v1Err);
  }

  var hashes = FOLLOWER_QUERY_HASHES.slice();
  if (query_hash && hashes.indexOf(query_hash) === -1) {
    hashes.push(query_hash);
  }

  for (var i = 0; i < hashes.length; i++) {
    try {
      var gqlFollowers = await fetch_friendships_graphql(hashes[i], "edge_followed_by", userId);
      if (debugMode) console.log('async_get_followers completed via graphql', hashes[i], gqlFollowers.length);
      return gqlFollowers;
    } catch (gqlErr) {
      if (debugMode) console.log('async_get_followers graphql error', hashes[i], gqlErr);
    }
  }

  return null;
}

async function async_get_followings(query_hash, userId) {
  if (debugMode) console.log('async_get_followings started');

  try {
    var followings = await fetch_friendships_v1("following", userId);
    if (debugMode) console.log('async_get_followings completed via v1', followings.length);
    return followings;
  } catch (v1Err) {
    if (debugMode) console.log('async_get_followings v1 fallback to graphql', v1Err);
  }

  var hashes = FOLLOWING_QUERY_HASHES.slice();
  if (query_hash && hashes.indexOf(query_hash) === -1) {
    hashes.push(query_hash);
  }

  for (var i = 0; i < hashes.length; i++) {
    try {
      var gqlFollowings = await fetch_friendships_graphql(hashes[i], "edge_follow", userId);
      if (debugMode) console.log('async_get_followings completed via graphql', hashes[i], gqlFollowings.length);
      return gqlFollowings;
    } catch (gqlErr) {
      if (debugMode) console.log('async_get_followings graphql error', hashes[i], gqlErr);
    }
  }

  return null;
}

async function async_update_instagram_info() {
  if (debugMode) console.log('async_update_instagram_info started');
  let followers = null,
    followings = null,
    hasError = false;

  let userId = getCookie('ds_user_id');

  if (userId && Number(userId) > 0) {
    if (debugMode) console.log('1');
    followers = await async_get_followers('c76146de99bb02f6415203be841dd25a', userId);
    if (debugMode) console.log('2');
    followings = await async_get_followings('3dec7e2c57367ef3da3d987d89f9dbc8', userId);
    if (debugMode) console.log('3');
  }

  hasError = !userId || Number(userId) <= 0 || followers == null || followings == null;
  sendUpdatedLists(!hasError, userId, followers, followings);

  if (debugMode) console.log('async_update_instagram_info ended', 'hasError', hasError, 'followers', followers, 'followings', followings);
}

async function go_profile(username) {
  if (debugMode) console.log('go_profile', username);
  if (typeof username === "string" && /^[a-zA-Z0-9._]+$/.test(username)) {
    location.href = "https://www.instagram.com/" + encodeURIComponent(username) + "/";
  }
}

async function performFriendshipAction(user_id, actionType) {
  var csrftoken = getCookie("csrftoken");
  if (!csrftoken || csrftoken.length === 0 || !user_id) {
    if (debugMode) console.log('csrftoken or user_id is empty');
    return false;
  }

  var tokens = getPageSecurityTokens();
  var params = new URLSearchParams({
    container_module: "profile",
    nav_chain: "PolarisProfilePostsTabRoot:profilePage:1:via_cold_start",
    user_id: String(user_id)
  });
  if (tokens.fbDtsg) {
    params.set("fb_dtsg", tokens.fbDtsg);
    params.set("jazoest", tokens.jazoest);
  }

  var endpoints = actionType === "unfollow"
    ? [
        `https://www.instagram.com/api/v1/friendships/destroy/${encodeURIComponent(user_id)}/`,
        `https://www.instagram.com/web/friendships/${encodeURIComponent(user_id)}/unfollow/`
      ]
    : [
        `https://www.instagram.com/api/v1/friendships/create/${encodeURIComponent(user_id)}/`,
        `https://www.instagram.com/web/friendships/${encodeURIComponent(user_id)}/follow/`
      ];

  for (var i = 0; i < endpoints.length; i++) {
    try {
      var response = await fetch(endpoints[i], {
        method: "POST",
        headers: getInstagramHeaders(true),
        credentials: "same-origin",
        body: params.toString()
      });

      var isJson = response.headers.get("content-type")?.includes("application/json");
      var data = isJson ? await response.json() : null;

      if (response.ok && isJson && data && (data.status === "ok" || data.friendship_status)) {
        return true;
      }
    } catch (err) {
      if (debugMode) console.log(`performFriendshipAction ${actionType} error on ${endpoints[i]}`, err);
    }
  }

  return false;
}

async function async_unfollow(user_id) {
  var success = await performFriendshipAction(user_id, "unfollow");
  sendGenericMessage('unfollow_result', success, user_id);
}

async function async_follow(user_id) {
  var success = await performFriendshipAction(user_id, "follow");
  sendGenericMessage('follow_result', success, user_id);
}

chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    if (!sender || sender.id !== chrome.runtime.id) {
      return false;
    }
    if (debugMode) console.log('chrome.runtime.onMessage.addListener', request, sender, sendResponse);
    if (request) {
      if (request.process == 'update_instagram_info') {
        async_update_instagram_info();
      } else if (request.process == 'go_profile') {
        go_profile(request.username);
      } else if (request.process == 'follow') {
        async_follow(request.user_id);
      } else if (request.process == 'unfollow') {
        async_unfollow(request.user_id);
      }
    }
    if (typeof sendResponse === "function") {
      sendResponse({ received: true });
    }
    return false;
  }
);