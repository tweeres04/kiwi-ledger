ssh server -T <<'EOL'
	cd kiwi-ledger && \
	git fetch && git reset --hard origin/main && \
	docker compose up --build -d
EOL