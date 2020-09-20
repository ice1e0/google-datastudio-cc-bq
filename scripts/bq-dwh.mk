create-bq-dataset:
	bq --project_id "$(GOOGLE_CLOUD_PROJECT_ID)" mk "$(BQ_DATASET_NAME)"

build-bq-dwh:
	bq -q --project_id "$(GOOGLE_CLOUD_PROJECT_ID)" show "$(BQ_DATASET_NAME)" > /dev/null || make create-bq-dataset
	bq -q --project_id "$(GOOGLE_CLOUD_PROJECT_ID)" --dataset_id "$(BQ_DATASET_NAME)" query --nouse_legacy_sql "$$(cat bq_dwh/wikipedia_pageviews.sql)"

.clean-bq-dwh:
	bq -q --project_id "$(GOOGLE_CLOUD_PROJECT_ID)" rm -r -f -d "$(BQ_DATASET_NAME)"
