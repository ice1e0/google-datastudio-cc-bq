create-gcs-bucket:
	gsutil mb -p "$(GOOGLE_CLOUD_PROJECT_ID)" -c STANDARD -b on "gs://$(GCS_BUCKET_NAME)"
	gsutil iam ch allUsers:objectViewer "gs://$(GCS_BUCKET_NAME)"

sync-gcs:
	gsutil cp -r gcs_sample_data/* "gs://$(GCS_BUCKET_NAME)"

.cleanup-gcs:
	gsutil rm -r "gs://$(GCS_BUCKET_NAME)"
