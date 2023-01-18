import {
  initializeBlock,
  useBase,
  useCursor,
  useRecords,
  useLoadable,
  useWatchable
} from '@airtable/blocks/ui';
import React, {useState, useEffect} from 'react';
import {Accordion} from "react-bootstrap";
import _ from "lodash";
import './App.css';

const mapping = {
  0: "Avaliable All Day",
  1: "Avaliable All Day",
  2: "Avaliable All Day",
  3: "Avaliable All Day",
  4: "Avaliable All Day",
  5: "5-6 am PST",
  6: "6-7 am PST",
  7: "7-8 am PST",
  8: "8-9 am PST",
  9: "9-10 am PST",
  10: "10-11 am PST",
  11: "11am-12pm PST",
  12: "12-3 pm PST",
  13: "12-3 pm PST",
  14: "12-3 pm PST",
  15: "3-6 pm PST",
  16: "3-6 pm PST",
  17: "3-6 pm PST",
  18: "6-9 pm PST",
  19: "6-9 pm PST",
  20: "6-9 pm PST",
  21: "9-11 pm PST",
  22: "9-11 pm PST",
  23: "9-11 pm PST"
}

function RecommendOperators() {
  //
  const base = useBase();

  //Watch which event is being used
  const cursor = useCursor();
  useLoadable(cursor);
  useWatchable(cursor, ['selectedRecordIds']);

  //OperatorAvailability
  const operatorAvailabilityTable = base.getTableByName('Operator Availability');
  let operatorAvailabilityRecords = useRecords(operatorAvailabilityTable, {sorts: [
        {field: 'Operator Tier Tracking - Core Group?'},
     ]})

  function isOperatorMarkedAvailable(record) {
    if (!selectedEvent) {
      return false;
    }
    let availability = record.getCellValueAsString(availabilityField)
    let startHour = parseInt(selectedEvent.getCellValueAsString("JR - Check-In - Hour of Day (PT)"));
    let endHour = parseInt(selectedEvent.getCellValueAsString("JR - End - Hour of Day (PT)"));

    let startHourIncluded = availability.includes(mapping[startHour])
    let endHourIncluded = availability.includes(mapping[endHour])
    if (availability == "Available All Day" || (startHourIncluded && endHourIncluded)) {
      return true;
    } else {
      return false;
    }

  }

  //Upcoming Events
  const scheduledEventsTable = base.getTableByName('Event Schedule');
  const assignedEventsView = scheduledEventsTable.getViewByName("Assigned Events")
  let scheduledEventsRecords = useRecords(scheduledEventsTable);
  let assignedEventsRecords = useRecords(assignedEventsView);

  function upcomingEventsByAssignedOperator(name) {
    return assignedEventsRecords.filter(record => {
      return record.getCellValueAsString("Assigned Operator") == name;
    })
  }

  function isOperatorBusy(operator) {
    let upcomingEvents = upcomingEventsByAssignedOperator(operator.getCellValueAsString("User"));
    let selectedEventCheckInTime = Date.parse(selectedEvent.getCellValueAsString("JR - Check-In Time - PT"));
    let selectedEventEndTime = Date.parse(selectedEvent.getCellValueAsString("JR - End Time - PT"));
    let scheduleConflict = false;
    upcomingEvents.map(event => {
      let eventCheckInTime = Date.parse(event.getCellValueAsString("JR - Check-In Time - PT"));
      let eventEndTime = Date.parse(event.getCellValueAsString("JR - End Time - PT"));
      //if(start_times1 <= end_times2 && end_times1 >= start_times2) {}
      if ((selectedEventCheckInTime < eventEndTime && selectedEventEndTime > eventCheckInTime)) {
        scheduleConflict = true;
      }
    })
    return !scheduleConflict;
  }

  //Past Events
  const pastEventsTable = base.getTableByName('Past Events');
  const pastEventsView = pastEventsTable.getViewByName("Assigned Events")
  let pastEventsRecords = useRecords(pastEventsView);
  function operatorsLastEvent(name){
    return pastEventsRecords.filter(r => {
      return r.getCellValueAsString("Assigned Operator") == name;
    })[0]
  }


  //Client/Operator Tier
  function isOperatorCorrectTier(record) {
    let clientTier = selectedEvent.getCellValueAsString("JR - AM Status Table - Client Tier");
    let operatorTier = record.getCellValueAsString("Operator Tier Tracking - Operator Tier");
    const operatorToClientTierMapping = {
      "1": [
        "VIP Strike",
        "1A - VIP",
        "1B - New Client (High Needs)",
        "1C - Existing Client (high needs)",
        "1D - Recent Issues",
        "2 - New Client (Standard)",
        "3 - Standard Client",
        "4 - Easy/Low Risk"
      ],
      "2": [
        "2 - New Client (Standard)", "3 - Standard Client", "4 - Easy/Low Risk"
      ],
      "3": [
        "3 - Standard Client", "4 - Easy/Low Risk"
      ],
      "4/New": ["4 - Easy/Low Risk"],
      "": [""]
    }
    return operatorToClientTierMapping[operatorTier].indexOf(clientTier) >= 0;

  }

  let selectedEvent = scheduledEventsRecords.filter(r => r.id == cursor.selectedRecordIds[0])[0]
  let availabilityField = selectedEvent
    ?.getCellValueAsString("JR - Operator Availability Field Name")
  let markedAvailableOperators = operatorAvailabilityRecords.filter(isOperatorMarkedAvailable);
  let notBusyOperators = markedAvailableOperators.filter(isOperatorBusy);
  //console.log(notBusyOperators[0].getCellValueAsString("User"));
  let correctTierOperators = notBusyOperators.filter(isOperatorCorrectTier);

  return (<div>
    <p>Date: {
        selectedEvent
          ?.getCellValueAsString("Date")
      }</p>
    <p>Tier: {
        selectedEvent
          ?.getCellValueAsString("JR - AM Status Table - Client Tier")
      }</p>
    <p>Check-In Time: {
        selectedEvent
          ?.getCellValueAsString("JR - Check-In Time - PT")
      }</p>
    <p>End Time: {
        selectedEvent
          ?.getCellValueAsString("JR - End Time - PT")
      }</p>
    <p>Tier: {
        selectedEvent
          ?.getCellValueAsString("JR - AM Status Table - Client Tier")
      }</p>
    <h2>Marked Available Operators: {markedAvailableOperators.length}</h2>
    <h3>Not Busy Operators: {notBusyOperators.length}</h3>
    <h4>Correct Tier: {correctTierOperators.length}</h4>
    <div>
      {
        notBusyOperators.map(r => <div key={r.id}>
          <h2>{r.getCellValueAsString("Name")}</h2>
          <h4>Tier: {r.getCellValueAsString("Operator Tier Tracking - Operator Tier")}</h4>
          <h4>Core Group: {r.getCellValueAsString("Operator Tier Tracking - Core Group?")}</h4>
          <h4>Late Check-Ins: {r.getCellValueAsString("Operator Tier Tracking - Late Check-In Tally")}</h4>
          <h4>Missed Services: {r.getCellValueAsString("Operator Tier Tracking - Missed Service Tally")}</h4>
          <p>
            <b>Email:</b>
            <span>{r.getCellValueAsString("Email Address")}</span>
          </p>
          <p>
            <b>Certifications:</b>
            {r.getCellValueAsString("Operator Tier Tracking - Perf. Arts Certified") == "checked" && <em>PA |</em>}
            {r.getCellValueAsString("SF Approved") == "checked" && <em>SF |</em>}
          </p>
          <p><b>Availability:</b> {r.getCellValueAsString(availabilityField)}</p>
          <div>
            <h5>Upcoming Events: {upcomingEventsByAssignedOperator(r.getCellValueAsString("User")).length}</h5>
            {
              upcomingEventsByAssignedOperator(r.getCellValueAsString("User")).map(event => <div key={event.id}>
                <p>
                  <b>Time:</b>
                  <span>{event.getCellValueAsString("JR - Check-In Time - PT")}
                    - {event.getCellValueAsString("JR - End Time - PT")}</span>
                </p>
              </div>)
            }
          </div>
          <div>
            <h5>Available for Day-Of Assignemnts on . . .</h5>
            {
              [
                "Wed 1",
                "Thu 1",
                "Fri 1",
                "Sat 1",
                "Sun 1",
                "Mon 1",
                "Tue 1",
                "Wed 2",
                "Thu 2",
                "Fri 2",
                "Sat 2",
                "Sun 2",
                "Mon 2",
                "Tue 2"
              ].map(day => r.getCellValueAsString("Available for Day-Of Assignments (" + day + ")") == "checked" && <span key={_.uniqueId()}>{day}, </span>)
            }
          </div>
          <div>
            <h5>Operators Last Event</h5>
            <p>Event ID: {operatorsLastEvent(r.getCellValueAsString("User"))?.getCellValueAsString("Event ID")}, CID: {operatorsLastEvent(r.getCellValueAsString("User"))?.getCellValueAsString("CID")}, Date: {operatorsLastEvent(r.getCellValueAsString("User"))?.getCellValueAsString("Date")},  Client: {operatorsLastEvent(r.getCellValueAsString("User"))?.getCellValueAsString("Client Name")}</p>
          </div>
        </div>)
      }
    </div>

  </div>);
}

initializeBlock(() => <RecommendOperators/>);
