//This Event
let recordId = input.config().recordId;
fetch("https://hooks.zapier.com/hooks/catch/8200276/bqum8kh/?recordId=" + recordId)
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

//Upcoming Events
const eventScheduleTable = base.getTable('Event Schedule');
let producedEventsView = eventScheduleTable.getView("Upcoming Produced Events")
let producedEventsQuery = await producedEventsView.selectRecordsAsync();
let producedEvents = producedEventsQuery.records
let event = producedEvents.filter((e) => e.id == recordId)[0]
if(!event){
  fetch("https://hooks.zapier.com/hooks/catch/8200276/bq887jp/?recordId=" + recordId)
}

//Operator Availability
const availabilityTable = base.getTable("Operator Availability");
const eligibleView = availabilityTable.getView("Eligible Operators")
let operatorAvailabilityQuery = await eligibleView.selectRecordsAsync();
let operatorAvailability = operatorAvailabilityQuery.records

function upcomingEventsByAssignedOperator(name) {
  return producedEvents.filter(record => {
    let operatorName = record.getCellValueAsString("Assigned Operator").split('"').join('')
    return operatorName == name;
  })
}

function isOperatorMarkedAvailable(record) {
  let availabilityField = event.getCellValueAsString("JR - Operator Availability Field Name");
  let availability = "";

  try {
  availability = record.getCellValueAsString(availabilityField)
}
catch(err) {
  return true;
}



  let startHour = parseInt(event.getCellValueAsString("JR - Check-In - Hour of Day (PT)"));
  let endHour = parseInt(event.getCellValueAsString("JR - End - Hour of Day (PT)"));

  let startHourIncluded = availability.includes(mapping[startHour])
  let endHourIncluded = availability.includes(mapping[endHour])
  if (availability == "Available All Day" || (startHourIncluded && endHourIncluded)) {
    return true;
  } else {
    return false;
  }

}

function isOperatorBusy(operator) {
  let selectedEvent = this;
  let upcomingEvents = upcomingEventsByAssignedOperator(operator.getCellValueAsString("User"));
  let selectedEventCheckInTime = Date.parse(selectedEvent.getCellValueAsString("JR - Start Time - PT"));
  let selectedEventEndTime = Date.parse(selectedEvent.getCellValueAsString("JR - End Time - PT"));
  let scheduleConflict = false;
  upcomingEvents.map(event => {
    let eventCheckInTime = Date.parse(event.getCellValueAsString("JR - Start Time - PT"));
    let eventEndTime = Date.parse(event.getCellValueAsString("JR - End Time - PT"));
    //if(start_times1 <= end_times2 && end_times1 >= start_times2) {}
    if ((selectedEventCheckInTime < eventEndTime && selectedEventEndTime > eventCheckInTime)) {
      scheduleConflict = true;
    }
  })
  return !scheduleConflict;
}

function isOperatorCorrectTier(record) {
  let selectedEvent = this;
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
  if(operatorToClientTierMapping[operatorTier]){
    return operatorToClientTierMapping[operatorTier].indexOf(clientTier) >= 0;
  } else {
    return false;
  }

}


//Determine availability & notBusy for this event
let markedAvailableOperators = operatorAvailability.filter(isOperatorMarkedAvailable, event);
let notBusyOperators = markedAvailableOperators.filter(isOperatorBusy, event);
let notAssignedOperator = notBusyOperators;
if (event.getCellValueAsString("Assigned Operator")){
  notAssignedOperator = notBusyOperators.filter((o) => o.getCellValueAsString("User") != event.getCellValueAsString("Assigned Operator"));
}

let correctTierOperators = notAssignedOperator.filter(isOperatorCorrectTier, event);
console.log(notAssignedOperator.length);
console.log(correctTierOperators.length);
let correctTierOperatorIds = correctTierOperators.map(r => r.id)
let notCorrectTierOperators = notAssignedOperator.filter((r) => correctTierOperatorIds.indexOf(r.id) < 0 , event);
console.log(notCorrectTierOperators.length);

//Create rows in Last Minute Table
let lastMinuteTable = base.getTable("Last Minute Event Messaging");
let lastIndex = 0;
correctTierOperators.map((o, index) => {
  lastIndex += 1;
  lastMinuteTable.createRecordAsync({"Operator (from Operator Availability)": [{id: o.id}], "Event (from Event Schedule)": [{id: event.id}], "Order": index})
});
notCorrectTierOperators.map((o, index) => {
  let newIndex = lastIndex + index;
  lastMinuteTable.createRecordAsync({"Operator (from Operator Availability)": [{id: o.id}], "Event (from Event Schedule)": [{id: event.id}], "Order": newIndex})
});

fetch("https://hooks.zapier.com/hooks/catch/8200276/bwjwt3g/?correctTier=" + correctTierOperators.length + "&notCorrectTier=" + notCorrectTierOperators.length + "&eventId=" + event.getCellValueAsString("Event ID") + "&eventTitle=" + event.getCellValueAsString("Event Title") + "&clientName=" + event.getCellValueAsString("Client Name") + "&checkInTimePT=" + event.getCellValueAsString("JR - Check-In Time - PT") )
