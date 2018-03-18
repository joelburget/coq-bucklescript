type action =
  | Typed(string)
  | Command(string);

type state = {
  /* commands: list(string) */
  text: string,
  history: list(string),
  /* inputRef: ref(option(ReasonReact.reactRef)), */
  inputRef: ref(option(Dom.element)),
};

let component = ReasonReact.reducerComponent("Repl");

let onSubmit = (text) => { Js.log(text) };

let valueFromEvent = (evt) : string => (
  evt
  |> ReactEventRe.Form.target
  |> ReactDOMRe.domElementToObj
)##value;

let setInputRef = (theRef: Js.nullable(Dom.element), {ReasonReact.state}) => {
  state.inputRef := Js.Nullable.toOption(theRef);
};

let make = (_children) => {
  ...component,

  initialState: fun () => {
    /* commands: {}, */
    text: "",
    history: [],
    inputRef: ref(None),
  },

  reducer: fun (action, state) =>
    switch (action) {
    | Command(line) => ReasonReact.Update({
        ...state,
        history: [line, ...state.history],
        text: "",
      })
    | Typed(text) => ReasonReact.Update({...state, text})
    },

  render: ({state: {history, text, inputRef}, reduce, handle}) => {
    let output =
      history
      |> List.mapi((i, op) =>
        <p key=string_of_int(i)>(ReasonReact.stringToElement(op))</p>
      )
      |> List.rev
      |> Array.of_list
      |> ReasonReact.arrayToElement;

    /* Autofocus input whenever the console is clicked */
    <div
      className="input"
      onClick=((_evt) => switch (inputRef^) {
      | Some(input) =>
        let node = ReactDOMRe.domElementToObj(input);
        /* let node = ReasonReact.refToJsObj(input); */
        node##focus();
      | _ => ()
      })
    >
      (output)
      <p>
        <span className="prompt">(ReasonReact.stringToElement("> "))</span>
        <input
          ref=(handle(setInputRef))
          autoFocus=Js.true_
          value=text
          _type="text"
          onChange=(reduce((evt) => Typed(valueFromEvent(evt))))
          onKeyDown=((evt) =>
          if (ReactEventRe.Keyboard.key(evt) == "Enter") {
            onSubmit(text);
            (reduce(() => Command(text)))()
          })
        />
      </p>
    </div>
  }
};
