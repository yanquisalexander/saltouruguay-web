import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { User } from "./User";

export enum LoanStatus {
    PENDING = "pending",
    REPAID = "repaid",
    DEFAULTED = "defaulted"
}

@Entity("loans")
export class Loan {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "lender_id", nullable: true })
    lenderId?: number;

    @Column({ name: "borrower_id", nullable: true })
    borrowerId?: number;

    @Column()
    amount: number;

    @Column({ name: "due_date", type: "timestamp" })
    dueDate: Date;

    @Column({ type: "enum", enum: LoanStatus, default: LoanStatus.PENDING })
    status: LoanStatus;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @ManyToOne(() => User, user => user.lentLoans, { nullable: true })
    @JoinColumn({ name: "lender_id" })
    lender?: User;

    @ManyToOne(() => User, user => user.borrowedLoans, { nullable: true })
    @JoinColumn({ name: "borrower_id" })
    borrower?: User;
}
