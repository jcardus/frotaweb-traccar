import React from 'react';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';
import {formatTime} from "../util/formatter";

const TimeLine = ({trips, stops, events}) => {
    return ( <Timeline>
        {trips.map((t, i) => (
            <>
                <TimelineItem>
                    <TimelineOppositeContent color="textSecondary" >
                        {formatTime(t.startTime, 'time')}
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                        <TimelineDot color="success" />
                        <TimelineConnector />
                    </TimelineSeparator>
                    <TimelineContent>Start
                        {i===0 && (<p style={{'font-size': 'x-small'}}>{trips[0] && trips[0].startAddress}</p>)}
                        <p style={{'font-size': 'smaller', margin: 1}}>{Math.round(t.distance / 1000)}km</p>
                    </TimelineContent>
                </TimelineItem>
                <TimelineItem>
                    <TimelineOppositeContent color="textSecondary">
                        {formatTime(t.endTime, 'time')}
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                        <TimelineDot color="error"/>
                        {i<trips.length-1 && (<TimelineConnector color="error"/>)}
                    </TimelineSeparator>
                    <TimelineContent>Stop
                        <p style={{'font-size': 'x-small'}}>{t.endAddress}</p>
                    </TimelineContent>
                </TimelineItem>
            </>
        ))}
    </Timeline> );
}
export default TimeLine;


