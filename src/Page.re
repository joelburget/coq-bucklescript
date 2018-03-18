let component = ReasonReact.statelessComponent("Page");

let make = (~message, _children) => {
  ...component,
  render: (self) =>
    <div>
      <h2>(ReasonReact.stringToElement("Planetary REPL"))</h2>
      <Repl />
    </div>
};