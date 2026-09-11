import { useEffect, useState } from "react"
import { styled } from "@mui/material"
import CommonPureCheckBox from "./CommonPureCheckBox"
import constant from "../misc/constant"
import { ValueOf } from "../../types/common"

const ListItem = styled('li')(({theme}) => ({
    margin: theme.spacing(0.5)
}))

export declare type TWeapon = ValueOf<typeof constant.WEAPON>

export declare type ExcludeWeaponListProps = {
    readonly onChange: (excludeMap: Record<TWeapon, boolean>) => void
}

export default function WeaponCheckBox(props: ExcludeWeaponListProps) {
    const [flags, setFlags] = useState<Record<TWeapon, boolean>>(
        Object.values(constant.WEAPON).reduce((acc, item) => ({ ...acc, [item]: true }), {} as any)
    )

    useEffect(() => {
        props.onChange(flags)
    }, [flags])

    return <div className="flex flex-row items-center max-w-full w-screen">
        <p className="mx-4">Blade</p>
        <CommonPureCheckBox
            isHorizontal
            onChange={setFlags}
            state={flags}
        />
    </div>

}