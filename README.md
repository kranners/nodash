# nodash 🙅🚫

VSCode extension for common JavaScript and TypeScript refactors and actions 📝

### Planned features

- [x] Convert ternary statement to if/else IIFE
- [x] Split IIFE into declaration and call expression
- [x] Simplify if/else statement into early return
- [x] Invert and simplify if/else statement into early return
- [ ] Refactor Lodash map/filter/forEach into ES equivalent
- [ ] Refactor Lodash isNull

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
