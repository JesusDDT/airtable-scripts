import {base} from '@airtable/blocks';
import {FieldType} from '@airtable/blocks/models';
import axios from 'axios'
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
//import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

function HelloWorldApp() {
  const base = useBase();
  const table = base.getTableByName("Operator Availability");
  let records = useRecords(table);r

  let fields = table.fields;
  let availabilityFields = fields.filter(f => (f.name.includes(",") && f.name.includes("/") && !f.name.includes("Available for Day-Of Assignments")))
  let recurringAvailabilityFields = fields.filter((f) => f.name.includes("Recurring") && !f.name.includes("Day-Of"));
  let weekdays = {
    0: "Sunday",
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
    7: "Sunday"
  }
  function moveFields(value) {

    if (window.confirm("Are you really sure you want to move every field by " + value + " days?")) {
      availabilityFields.map((f, i) => {

        setTimeout(() => {

          let name = f.name
          let monthDay = name.split(",")[1].trim()
          let month = monthDay.split("/")[0]
          let day = monthDay.split("/")[1]

          let currentYear = new Date().getFullYear();
          let fieldDateCurrrentYear = new Date(currentYear, month - 1, day)
          let fieldDatePreviousYear = new Date(currentYear - 1, month - 1, day)
          let fieldDateNextYear = new Date(currentYear + 1, month - 1, day)
          let dates = [fieldDateCurrrentYear, fieldDatePreviousYear, fieldDateNextYear];
          var temp = dates.map(d => Math.abs(new Date() - new Date(d).getTime()));
          var idx = temp.indexOf(Math.min(...temp));
          let fieldDate = dates[idx]
          let newDate = new Date(fieldDate.setDate(fieldDate.getDate() + value));


          let newNameString = weekdays[newDate.getDay()] + ", " + (
          newDate.getMonth() + 1) + "/" + newDate.getDate();
          f.updateNameAsync(newNameString);

        }, i * 1000);

      });
    }
  }

  function setAvailability() {
    if (window.confirm("Are you really sure you want to reset availability?")) {
      records.map(async (r) => {
        let obj = {}

        availabilityFields.map((f) => {
          let day = f.name.split(",")[0]
          let recurringFieldName = "Recurring - " + day;
          obj[f.name] = r.getCellValue(recurringFieldName) || [
            {
              name: "Not Available"
            }
          ];
        })

        await table.updateRecordAsync(r.id, obj)

      })
    }
  }

  function emailOperators() {
    if (window.confirm("Are you really sure you want to email blast all of the operators?")) {
      records.map(async (r) => {
        axios.get("https://hooks.zapier.com/hooks/catch/8200276/bf5u25a/?r=" + r.id)
      });
    }
  }

  return (<div className="container">
    <div className="row">
      <h2>Move fields forward/backward</h2>
      <p>These actions can be undone, but please still be sure. This will take a few seconds to run, so count to 10 after you click it.</p>
      <div className="col-3">
        <Button onClick={(e) => moveFields(14)}>Move forward two weeks</Button>
      </div>
      <div className="col-3">
        <Button onClick={(e) => moveFields(-14)}>Move backward two weeks</Button>
      </div>
    </div>
    <div className="row mt-5">
      <h2>Reset Availability</h2>
      <p>Take the Recurring Availability & set it for actual availability. THIS CANNOT BE UNDONE.</p>
      <div className="col-3">
        <Button onClick={(e) => setAvailability()}>Set Availability based on Recurring</Button>
      </div>
    </div>
    <div className="row mt-5">
      <h2>Send Email Blast</h2>
      <p>Email every operator and tell them to set their availability. THIS CANNOT BE UNDONE.</p>
      <div className="col-3">
        <Button onClick={(e) => emailOperators()}>Email Operators</Button>
      </div>
    </div>
  </div>);
}

initializeBlock(() => <HelloWorldApp/>);
