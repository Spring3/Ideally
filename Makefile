.PHONY: test
run:
	cp env.tpl .env
	node server.js
deps:
	npm i
test:
	npm test