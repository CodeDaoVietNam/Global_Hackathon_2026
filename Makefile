.PHONY: up down logs test eval

up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

test:
	python -m pytest -q

eval:
	python eval/evaluate.py
