# nodash 🙅🚫

VSCode extension for common JavaScript and TypeScript refactors and actions 📝

### Installation

Nodash can be installed one of a few ways:

1. From the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=aaron-pierce.nodash)
2. Download [the .vsix from the latest release](https://github.com/kranners/nodash/releases) and install with:

```shell
code --install-extension ./path/to/nodash.vsix
```

3. Clone repository and build from source with:

```shell
npm install
npm run package
code --install-extension ./path/to/nodash.vsix
```

### Existing features

## Convert ternary statement to if/else IIFE

Will take any ternary expression, like:

```js
const displayRange = !start.isSame(end, "day")
  ? !start.isSame(end, "month")
    ? !start.isSame(end, "year")
      ? start.format("ddd D MMM 'YY") + " - " + end.format("ddd D MMM 'YY")
      : start.format("ddd D MMM") + " - " + end.format("ddd D MMM 'YY")
    : start.format("ddd D") + " - " + end.format("ddd D MMM 'YY")
  : start.format("ddd D MMM 'YY");
```

And convert it into a function expression like:

```js
const displayRange = (() => {
  if (!start.isSame(end, "day")) {
    if (!start.isSame(end, "month")) {
      if (!start.isSame(end, "year")) {
        return (
          start.format("ddd D MMM 'YY") + " - " + end.format("ddd D MMM 'YY")
        );
      } else {
        return start.format("ddd D MMM") + " - " + end.format("ddd D MMM 'YY");
      }
    } else {
      return start.format("ddd D") + " - " + end.format("ddd D MMM 'YY");
    }
  } else {
    return start.format("ddd D MMM 'YY");
  }
})();
```

## Simplify if/else statement into early return

Takes in any if/else statement like:

```js
if (condition) {
  return then;
} else {
  return else;
}
```

And converts it into an early return if statement like:

```js
if (condition) {
  return then;
}

return else;
```

## Invert and simplify if/else statement into early return

Takes in any if/else statement like:

```js
if (isAdmin) {
  /* Do lots of stuff */
  return then;
} else {
  return "You can't do that!";
}
```

And inverts the expression to convert into an if statement like:

```js
if (!isAdmin) {
  return "You can't do that!";
}

/* Do lots of stuff */
return then;
```

## Split IIFE into declaration and call expression

Will take any IIFE, including those used in a variable declaration, like:

```js
const displayRange = (() => {
  /* Your amazing logic would go in here */
})();
```

And split them into an arrow function and a call expression:

```js
const getDisplayRange = () => {
  /* Your amazing logic would go in here */
};
const displayRange = getDisplayRange();
```

## Refactor Lodash map/filter/forEach into ES equivalent

Will take a Lodash call to `map()` or `filter()` or `forEach()`, like:

```js
import _ from "lodash";

const fruits = ["banana", "apple", "mango"];

const angryFruits = _.map(fruits, (fruit) => fruit.toUpperCase());
const bFruits = _.filter(fruits, (fruit) => fruit[0] === "b");
_.forEach(fruits, (fruit) => console.log(`${fruit} is yum!`));
```

And convert it into regular ES calls:

```js
const fruits = ["banana", "apple", "mango"];

const angryFruits = fruits.map((fruit) => fruit.toUpperCase());
const bFruits = fruits.filter((fruit) => fruit[0] === "b");
fruits.forEach((fruit) => console.log(`${fruit} is yum!`));
```

## Replace unnecessary first()

Will take a Lodash `first()` call, like:

```js
const items = [...];

const firstItem = first(items);
```

And replace it with an element 0 access, like:

```js
const items = [...];

const firstItem = items[0];
```

## Replace unnecessary get()

Will take a Lodash `get()` call like:

```js
const appliedOffer = get(store, "offer", null);

const message = get(error, "errors[0].message", error.message);

const scrollTopBefore = _.get(document, "body.scrollTop");
```

And replace it with a chain of access expressions:

```js
const appliedOffer = cart.offer ?? null;

// If your call has a default value, all the access expressions will be null coalescing
const message = error?.errors?.[0].message ?? error.message;

const scrollTopBefore = document.body.scrollTop;
```

## Case switch to if

Will take in an arbitrary case switch like:

```js
function getCardContent(cardType) {
  switch (cardType) {
    case "banana":
    case "menu":
      console.log("No content");
      break;
    case "apple":
      return "Apples are red and crunchy. Usually. Maybe.";
    default:
      return "Click here to buy fantastic products:";
  }
}
```

And replace it with a series of if statements:

```js
function getCardContent(cardType) {
  if (cardType === "menu" || cardType === "banana") {
    console.log("No content");
    return;
  }
  if (cardType === "apple") {
    return "Apples are red and crunchy. Usually. Maybe.";
  }
  return "Click here to buy fantastic products:";
}
```

## Convert casing

Can take any identifier (like a variable name) or string literal like:

```js
const someVariable = "Hello, here is some text. I love text! It's fantastic.";
```

And convert either the variable or string to one of:

- camelCase
- PascalCase
- CONSTANT_CASE
- kebab-case
- snake_case

When renaming variable, this action will use
[the built-in command](https://code.visualstudio.com/api/references/commands) to rename all instances of that symbol at once.

Like:
```js
const SOME_VARIABLE = "hello-here-is-some-text-i-love-text-its-fantastic";
```
