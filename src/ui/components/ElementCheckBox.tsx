import { ValueOf } from "../../types/common"
import constant from "../misc/constant"
import CommonCheckBox from "./CommonCheckBox"

export declare type TElement = ValueOf<typeof constant.ELEMENT>

export declare type ElementCheckBoxProps = {
    readonly onChange: (flags: Record<TElement, boolean>) => void
}

export default function ElementCheckBox(props: ElementCheckBoxProps) {
    return <div className="flex flex-row items-center">
        <p className="mx-4">Element</p>
        <CommonCheckBox
            isHorizontal
            onChange={props.onChange}
            initialState={Object.values(constant.ELEMENT).reduce((acc, element) => ({...acc, [element]: true}), {} as Record<TElement, boolean>)}
        />
    </div>
}