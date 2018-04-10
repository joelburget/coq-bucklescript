/* open Sexp; */
open Serapi_protocol;

/* TODO:
  - handle up / down arrows
  - C-a, C-e, C-c etc
*/
type action =
  | Typed(string)
  | Command(string)
  | Message(answer);

module StringMap = Map.Make({
  type t = string;
  let compare = compare
});

type state = {
  text: string,
  history: StringMap.t((string, list(answer_kind))),
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

Js.log(exec_cmd(Noop));

let make = (_children) => {
  ...component,

  initialState: fun () => {
    {
      text: "",
      history: StringMap.empty,
      inputRef: ref(None),
    }
  },

  didMount: fun (_self) => {
    ReasonReact.SideEffects(_self => ());
  },

  reducer: fun (action, state) =>
    switch (action) {

    | Command(line) => {
      let history = state.history;
      /*
      let len = Array.length(history);
      /* unsafe_set because we're extending the array */
      Array.unsafe_set(history, len, (line, []));
      */
      ReasonReact.Update({
        ...state,
        history,
        text: "",
      }) /* , _self => WebWorkers.postMessage(state.worker, line)) */
    }
    | Typed(text) => ReasonReact.Update({...state, text})

    /* TODO: scroll to bottom (if already scrolled) */
    /* TODO: track Ack / Completed */
    | Message(msg) => {
      switch(msg) {
        | Answer(cmd_tag, answer_kind) => {
          let history = state.history;
          let (cmd, prev_history) = StringMap.find(cmd_tag, history);
          /* Array.set(history, cmd_tag, (cmd, [answer_kind, ...prev_history])); */
          let history = StringMap.add(cmd_tag, (cmd, [answer_kind, ...prev_history]), history);
          ReasonReact.Update({...state, history})
        }
        | Feedback({ contents }) => ReasonReact.SideEffects(_self =>
          Js.log2("processing feedback", contents)
        )
      }
    }
  },

  render: ({state: {history, text, inputRef}, reduce, handle}) => {
    /* TODO: make collapsible */
    let historyOutput =
      history
      |> StringMap.bindings
      |> List.map((historyEntry: (string, (string, list(answer_kind)))) => {
        let (i1, (op, output)) = historyEntry;
        let output_elems =
          output
          |> List.mapi((i2, answer_kind) => (
            <p key=(i1 ++ "." ++ string_of_int(i2))>(ReasonReact.stringToElement(Js.String.make(answer_kind)))</p>
          ))
          |> List.rev;

        Array.of_list(
          [ <p key=i1>(ReasonReact.stringToElement("> "++ op))</p>,
          ...output_elems
          ]);
      })
      |> Array.concat
      |> ReasonReact.arrayToElement;

    /* Autofocus input whenever the console is clicked */
    <div className="container">
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
        (historyOutput)
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
    </div>
  }
};
