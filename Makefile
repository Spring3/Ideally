.PHONY test
run:
	cp env.tpl .env
	npm start
deps:
	npm i
test:
	npm test