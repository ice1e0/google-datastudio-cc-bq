all:
	@if [ ! -f config.mk ]; then \
		echo "You have to copy config.mk.example to config.mk and adjust it with your environment parameters before calling 'make'"; \
		exit 1; \
	fi

	make .ensure-app-script-config-files

	# create google apps script if it does not exist
	if [ ! -f .clasp.json ]; then make create-apps-script-project; fi

	# create google cloud storage if it does not exist
	gsutil -q stat "gs://$(GCS_BUCKET_NAME)/data_studio_logo_40x40.png" || make create-gcs-bucket

	# builds the Data Warehouse in Big Query
	make build-bq-dwh

	# sync google cloud storage data + google apps script data
	make sync

include config.mk

include scripts/apps-script.mk
include scripts/bq-dwh.mk
include scripts/gcs.mk

sync:
	make -j sync-gcs sync-apps-script-project

cleanup:
	make .cleanup-gcs .clean-bq-dwh
