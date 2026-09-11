import CommonCheckBox from "./CommonCheckBox"
import constant from '../misc/constant'
import { ValueOf } from "../../types/common"

export declare type TDriver = ValueOf<typeof constant.DRIVER>

export declare type DriverCheckBoxProps = {
    readonly onChange: (flags: Record<TDriver, boolean>) => void
}

export default function DriverCheckBox(props: DriverCheckBoxProps) {
    return <div className="flex flex-row items-center">
        <p className="mx-4">Driver</p>
        <CommonCheckBox
            isHorizontal
            onChange={props.onChange}
            initialState={Object.values(constant.DRIVER).reduce((acc, driver) => ({...acc, [driver]: true}), {} as Record<TDriver, boolean>)}
        />
    </div>
}