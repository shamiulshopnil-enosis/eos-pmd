import { Fragment } from "react";

/**
 * Accessible 1–5 star rating input, CSS-only (no client JS): radios rendered
 * high-to-low, then flipped visually with row-reverse so the sibling
 * combinator in globals.css (`.star-rating`) can fill "this star and
 * everything before it". Inputs/labels must stay direct, unwrapped children
 * of the fieldset for the sibling selector to see them — do not wrap each
 * pair in its own element.
 */
export function RatingInput({ name, required, defaultValue }: { name: string; required?: boolean; defaultValue?: number }) {
  return (
    <fieldset className="star-rating">
      {[5, 4, 3, 2, 1].map((n) => (
        <Fragment key={n}>
          <input
            type="radio"
            id={`${name}-${n}`}
            name={name}
            value={n}
            required={required}
            defaultChecked={defaultValue === n}
            className="sr-only"
          />
          <label htmlFor={`${name}-${n}`}>★</label>
        </Fragment>
      ))}
    </fieldset>
  );
}
