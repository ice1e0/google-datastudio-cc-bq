/**
 * Returns the Auth Type of this connector.
 * @return {object} The Auth type.
 */
function getAuthType() {
    var cc = DataStudioApp.createCommunityConnector();
    return cc.newAuthTypeResponse()
        .setAuthType(cc.AuthType.OAUTH2)
        .build();
}
