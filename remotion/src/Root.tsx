import { Composition } from "remotion";
import { BookingDemoVertical } from "./BookingDemoVertical";
import { BookingDemoHorizontal } from "./BookingDemoHorizontal";

export const RemotionRoot = () => (
  <>
    <Composition
      id="booking-vertical"
      component={BookingDemoVertical}
      durationInFrames={750}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="booking-horizontal"
      component={BookingDemoHorizontal}
      durationInFrames={750}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
