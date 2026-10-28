// A date box. The browser's calendar symbol is hidden (no icons in this
// app), so clicking anywhere in the box opens the calendar instead.
// Typing the date with the keyboard still works.
function DateInput(props) {
  return (
    <input
      type="date"
      {...props}
      onClick={(event) => {
        try {
          event.currentTarget.showPicker?.();
        } catch {
          // showPicker is not allowed here; typing the date still works
        }
      }}
    />
  );
}

export default DateInput;
