import {
  initializeBlock,
  globalConfig,
  useBase,
  useRecords,
  Input,
  Button
} from '@airtable/blocks/ui';
import React, {useState} from "react";
import _ from 'lodash';
import './App.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
//import './node_modules/bootstrap/dist/css/bootstrap.min.css'
//import 'bootstrap-css-only/css/bootstrap.min.css';

function GeneratePayroll() {
  //Start Date
  let initialStartDate = new Date();
  initialStartDate.setDate(initialStartDate.getDate() - 15)
  const [startDate, setStartDate] = useState(initialStartDate.toISOString().split('T')[0]);

  //End Date
  let inititalEndDate = new Date()
  inititalEndDate.setDate(inititalEndDate.getDate() - 1)
  const [endDate, setEndDate] = useState(inititalEndDate.toISOString().split('T')[0]);

  //Get records
  const base = useBase();

  //Past Events
  const pastEventsTable = base.getTableByName("Past Events");
  const pastEventsView = pastEventsTable.getView("Assigned Events");
  let pastEvents = useRecords(pastEventsView);

  //Operator Availability
  const availabilityTable = base.getTableByName("Operator Availability");
  const gustoView = availabilityTable.getView("Gusto Payroll Operators")
  let operators = useRecords(gustoView);

  let rows = [

    [
      "contractor_type",
      "first_name",
      "last_name",
      "ssn",
      "business_name",
      "ein",
      "memo",
      "hours_worked",
      "wage",
      "reimbursement",
      "bonus"
    ]
  ];

  function buttonClicked() {
    //Get all operators that match
    var getDaysArray = function(s, e) {
      for (var a = [], d = new Date(s); d <= new Date(e); d.setDate(d.getDate() + 1)) {
        let date = new Date(d)
        let string = ("0" + (date.getMonth(d) + 1)).slice(-2) + "-" + (
        "0" + date.getDate(d)).slice(-2) + "-" + (
        date.getYear(d) + 1900);
        a.push(string);
      }
      return a;
    };
    let daysArray = getDaysArray(new Date(startDate).setDate(new Date(startDate).getDate() + 1), new Date(endDate).setDate(new Date(endDate).getDate() + 1));
    operators.map((o) => {
      let events = pastEvents.filter((e) => e.getCellValueAsString("Assigned Operator") == o.getCellValueAsString("User") && daysArray.indexOf(e.getCellValueAsString("Date")) > 0)
      if (events.length > 0) {
        let notes = "";
        let hours = 0;
        events.map((e) => {
          if (e.getCellValueAsString("Client Tier").indexOf("Strike") >= 0) {
            hours += e.getCellValue("Length of Service") * 2;
          } else {
            hours += e.getCellValue("Length of Service");
          }

          notes += [
            "Event ID: ",
            e.getCellValueAsString("Event ID"),
            "| CID:",
            e.getCellValueAsString("CID"),
            "| Date: ",
            e.getCellValueAsString("Date"),
            "| Event Title:",
            e.getCellValueAsString("Event Title"),
            "| Client Name",
            e.getCellValueAsString("Client Name"),
            "| Length (Hours):",
            e.getCellValueAsString("Length of Service"),
            "| Hourly Rate:",
            e.getCellValueAsString("Hourly Rate"),
            "| Total Amount:",
            e.getCellValueAsString("Total Amount"),
            "| -------- |"
          ].join('').replace(/,/g, '-');
        })
        let first_name = o.getCellValueAsString("Name").split(" ")[0]
        let last_name = o.getCellValueAsString("Name").split(" ")[1]
        let ssn = o.getCellValueAsString("SSN (Last 4)")
        let ein = o.getCellValueAsString("EIN")
        let business_name = o.getCellValueAsString("Business Name")
        rows.push([
          o.getCellValueAsString("Contractor Type") || "Individual",
          first_name,
          last_name,
          ssn,
          business_name,
          ein,
          notes,
          hours,
          0,
          "",
          ""
        ])
      }
    });
    let csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    let encodedUri = encodeURI(csvContent);
    window.open(encodedUri);

  }

  return (<div className="app">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossOrigin="anonymous"/>
    <div className="container mt-3">
      <div className="row">
        <div className="col-2">
          <h3>Start Date</h3>
          <Input value={startDate} onChange={e => setStartDate(e.target.value)} type="date"/>
        </div>
        <div className="col-2">
          <h3>End Date</h3>
          <Input value={endDate} onChange={e => setEndDate(e.target.value)} type="date"/>
        </div>
        <div className="col-3 text-center">
          <h3 className="text-center">Run It</h3>
          <Button onClick={() => buttonClicked()} variant="primary" icon="timeline">Run It!</Button>
        </div>
      </div>
    </div>
  </div>)
}
initializeBlock(() => <GeneratePayroll/ >);
