/*
 * Please take a look at https://developers.google.com/datastudio/connector/auth
 * how to implement OAuth
 */

/**
 * Returns the configured OAuth Service.
 * @return {Service} The OAuth Service
 */
function getOAuthService() {
    return OAuth2.createService('exampleService')
        .setAuthorizationBaseUrl('https://accounts.google.com/o/oauth2/auth')
        .setTokenUrl('https://accounts.google.com/o/oauth2/token')
        .setClientId(config().oauth_client_id)
        .setClientSecret(config().oauth_client_secret)
        .setPropertyStore(PropertiesService.getUserProperties())
        .setCallbackFunction('authCallback')
        .setScope('https://www.googleapis.com/auth/script.external_request')
        .setScope('https://www.googleapis.com/auth/bigquery.readonly')

        // Below are Google-specific OAuth2 parameters.

        // Sets the login hint, which will prevent the account chooser screen
        // from being shown to users logged in with multiple accounts.
        //.setParam('login_hint', Session.getActiveUser().getEmail())
        ;
};

/**
 * Resets the auth service.
 */
function resetAuth() {
    getOAuthService().reset();
}

/**
 * Returns true if the auth service has access.
 * @return {boolean} True if the auth service has access.
 */
function isAuthValid() {
    return getOAuthService().hasAccess();
}

/**
 * The OAuth callback.
 * @param {object} request The request data received from the OAuth flow.
 * @return {HtmlOutput} The HTML output to show to the user.
 */
function authCallback(request) {
    var authorized = getOAuthService().handleCallback(request);
    if (authorized) {
        return HtmlService.createHtmlOutput('Success! You can close this tab.');
    } else {
        return HtmlService.createHtmlOutput('Denied. You can close this tab');
    };
};

/**
 * Gets the 3P authorization URL.
 * @return {string} The authorization URL.
 * @see https://developers.google.com/apps-script/reference/script/authorization-info
 */
function get3PAuthorizationUrls() {
    return getOAuthService().getAuthorizationUrl();
}
