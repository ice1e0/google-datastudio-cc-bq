.ensure-app-script-config-files:
	# creates config files from the *.example files based on the settings in 'settings.mk'
	if [ ! -f src/config.js ]; then make build-config-js; fi
	if [ ! -f src/appsscript.json ]; then make build-appsscript-json; fi

build-config-js:
	cat src/config.js.example \
		| sed "s/<<YOUR_GOOGLE_CLOUD_PROJECT_ID>>/$(GOOGLE_CLOUD_PROJECT_ID)/g" \
		| sed "s/<<YOUR_GOOGLE_STORAGE_BUCKET_NAME>>/$(GCS_BUCKET_NAME)/g" \
		| sed "s/<<YOUR_OAUTH_CLIENT_ID>>/$(OAUTH_CLIENT_ID)/g" \
		| sed "s/<<YOUR_OAUTH_CLIENT_SECRET>>/$(OAUTH_CLIENT_SECRET)/g" \
		> src/config.js

build-appsscript-json:
	cat src/appsscript.json.example \
		| sed "s/<<YOUR APPS SCRIPT NAME>>/$(GOOGLE_APPS_SCRIPT_NAME)/g" \
		| sed "s/<<YOUR_GOOGLE_STORAGE_BUCKET_NAME>>/$(GCS_BUCKET_NAME)/g" \
		> src/appsscript.json

create-apps-script-project:
	clasp create --title "$(GOOGLE_APPS_SCRIPT_NAME)" --type standalone --rootDir src/

sync-apps-script-project:
	clasp push --force
